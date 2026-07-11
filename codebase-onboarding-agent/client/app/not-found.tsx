import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
export default function NotFound() {
    return (<main className="min-h-screen bg-gray-950 text-white flex flex-col
                     items-center justify-center gap-5 p-6 text-center">
      <FileQuestion size={48} className="text-gray-600"/>

      <div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-gray-400 text-sm">
          That URL doesn't exist. Maybe the share link expired?
        </p>
      </div>

      <Link href="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm
                   font-medium transition-colors">
        Back to home
      </Link>
    </main>);
}
