import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function HomeSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Stats Row Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-8">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-6 w-48 mb-8" />
            <div className="flex justify-center items-center h-[300px]">
              <Skeleton className="h-48 w-48 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ReceiptsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>

      <Card className="border shadow-sm">
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[240px]" />
          </div>
        </div>
        <div className="border-t p-4 space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-8 w-[60px]" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function AnalyzeSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 py-10 px-6">
      <div className="space-y-2 text-center md:text-left">
        <Skeleton className="h-10 w-64 mx-auto md:mx-0" />
        <Skeleton className="h-6 w-96 mx-auto md:mx-0" />
      </div>

      <Skeleton className="h-64 w-full rounded-2xl border-2 border-dashed" />

      <div className="space-y-6 pt-12 border-t text-center md:text-left">
        <Skeleton className="h-8 w-48 mx-auto md:mx-0" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="space-y-2 items-end flex flex-col">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
