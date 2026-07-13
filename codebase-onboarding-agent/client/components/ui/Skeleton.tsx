export const Skeleton = ({ className = '', style = {}, }: {
    className?: string;
    style?: React.CSSProperties;
}) => (<div className={`shimmer ${className}`} style={{ borderRadius: 6, ...style }} aria-hidden="true"/>);
export const FileTreeSkeleton = () => (<div className="p-3 flex flex-col gap-1.5" aria-label="Loading file tree...">
    {[
        { width: 'w-32', indent: 0 }, { width: 'w-24', indent: 1 },
        { width: 'w-28', indent: 1 }, { width: 'w-20', indent: 2 },
        { width: 'w-36', indent: 2 }, { width: 'w-24', indent: 1 },
        { width: 'w-28', indent: 0 }, { width: 'w-32', indent: 1 },
        { width: 'w-20', indent: 2 }, { width: 'w-24', indent: 1 },
        { width: 'w-36', indent: 0 }, { width: 'w-28', indent: 1 },
    ].map((item, i) => (<div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${item.indent * 14 + 8}px` }}>
        <Skeleton className="w-3.5 h-3.5 rounded shrink-0"/>
        <Skeleton className={`h-3 ${item.width} rounded`}/>
      </div>))}
  </div>);
export const RepoHeaderSkeleton = () => (<div className="border-b border-gray-800 px-6 py-4 flex items-center gap-6" aria-label="Loading repository info...">
    <Skeleton className="h-5 w-48 rounded"/>
    <Skeleton className="h-4 w-16 rounded"/>
    <Skeleton className="h-4 w-12 rounded"/>
    <Skeleton className="h-4 w-20 rounded"/>
  </div>);
  
export const ArchitectureSkeleton = () => (<div className="p-6 flex flex-col gap-6" aria-label="Loading architecture analysis...">
    <Skeleton className="h-5 w-48 rounded"/>

    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-16 rounded"/>
      <Skeleton className="h-4 w-full rounded"/>
      <Skeleton className="h-4 w-4/5 rounded"/>
    </div>

    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-24 rounded"/>
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-24 rounded-md"/>
        <Skeleton className="h-4 w-3/4 rounded"/>
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-20 rounded"/>
      <div className="flex flex-wrap gap-2">
        {[60, 80, 70, 90, 65].map((w, i) => (<Skeleton key={i} className={`h-7 w-${w === 60
            ? 16
            : w === 80
                ? 20
                : w === 70
                    ? 18
                    : w === 90
                        ? 24
                        : 16} rounded-md`}/>))}
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-28 rounded"/>
      <Skeleton className="h-4 w-full rounded"/>
      <Skeleton className="h-4 w-3/4 rounded"/>
    </div>

    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-24 rounded"/>
      {[1, 2, 3].map((i) => (<div key={i} className="flex gap-2">
          <Skeleton className="w-3 h-3 shrink-0 mt-0.5"/>
          <Skeleton className="h-4 flex-1 rounded"/>
        </div>))}
    </div>
  </div>);
export const CodeViewerSkeleton = () => (<div className="flex flex-col h-full" aria-label="Loading file contents...">
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded"/>
        <Skeleton className="h-4 w-40 rounded"/>
      </div>
      <Skeleton className="h-6 w-16 rounded"/>
    </div>

    <div className="flex-1 p-4 flex flex-col gap-2">
      {Array.from({ length: 18 }).map((_, i) => (<div key={i} className="flex gap-4">
          <Skeleton className="h-3 w-5 rounded shrink-0"/>
          <Skeleton className="h-3 rounded" style={{
            width: `${30 + ((i % 6) * 8)}%`,
            opacity: 1 - i * 0.03,
        } as React.CSSProperties}/>
        </div>))}
    </div>
  </div>);
