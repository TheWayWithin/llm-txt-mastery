import { NotFoundError } from "@/components/ErrorStates";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg">
        <NotFoundError 
          onHome={() => window.location.href = '/'}
          onRetry={() => window.location.reload()}
        />
      </div>
    </div>
  );
}
