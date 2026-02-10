import { Skeleton } from "@/components/ui/skeleton";

export function AuthSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border dark:border-zinc-800 space-y-6">
      {/* Title/Header Skeleton could be added here if common */}
      
      <div className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Optional Confirm Password (for register) */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Button Skeleton */}
      <Skeleton className="h-10 w-full rounded-md" />

      {/* SSO Divider & Buttons */}
      <div className="space-y-4 pt-4">
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>

      {/* Footer link */}
      <div className="flex justify-center">
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}
