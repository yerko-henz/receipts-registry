import { createSSRSassClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
) {
  // Await params if it's a promise (Next.js 15+ compat) or use as is
  const params = context.params instanceof Promise ? await context.params : context.params;
  const receiptId = params?.id;

  if (!receiptId) {
    return new NextResponse("Receipt ID required", { status: 400 });
  }

  const sassClient = await createSSRSassClient();
  const client = sassClient.getSupabaseClient();

  // 1. Check if user is authenticated
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    const url = new URL("/auth/login", request.url);
    // Encode the current URL as the next destination
    url.searchParams.set("next", `/api/receipts/image/${receiptId}`);
    return NextResponse.redirect(url);
  }

  // 2. Get receipt details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: receipt, error } = await (client as any)
    .from("receipts")
    .select("image_url, user_id")
    .eq("id", receiptId)
    .single();

  if (error || !receipt) {
    return new NextResponse("Receipt not found", { status: 404 });
  }

  // 3. Authorization check
  if (receipt.user_id !== user.id) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  if (!receipt.image_url) {
    return new NextResponse("No image for this receipt", { status: 404 });
  }

  // 4. Extract path from URL
  let path = receipt.image_url;
  
  // If it's an external URL (like placeholder), just redirect to it
  if (path.startsWith('http') && !path.includes('/receipts/')) {
       return NextResponse.redirect(path);
  }

  try {
    // If it's a full Supabase URL, extract proper path
    if (path.startsWith('http')) {
        const urlObj = new URL(path);
        path = urlObj.pathname;
    } 
    
    // Remove query parameters if present
    if (path.includes('?')) {
        path = path.split('?')[0];
    }
    
    // Decode URI component
    path = decodeURIComponent(path);

    // Remove bucket prefix if present in the path
    const parts = path.split('/receipts/');
    if (parts.length > 1) {
        path = parts[parts.length - 1];
    }
    
    // Remove leading slash if any remains
    if (path.startsWith('/')) {
        path = path.substring(1);
    }

  } catch (e) {
      console.error("Error parsing image path:", e);
      // Fallback: minimalist cleanup
       const match = path.match(/\/receipts\/(.+)$/);
       if (match && match[1]) {
         path = match[1];
       }
  }

  // 5. Create signed URL
  // Short expiration (60s) since we redirect immediately
  const { data, error: signError } = await client.storage
    .from("receipts")
    .createSignedUrl(path, 60);

  if (signError || !data?.signedUrl) {
    console.error("Error signing URL:", signError);
    return new NextResponse("Error generating link", { status: 500 });
  }

  // 6. Redirect to the actual image
  return NextResponse.redirect(data.signedUrl);
}
