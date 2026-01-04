export default function BlockedPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-3xl font-bold mb-4">
          Service Unavailable
        </h1>
        <p className="text-gray-400 mb-6">
          Sorry, this service is not available in your region due to local regulations.
        </p>
        <p className="text-sm text-gray-500">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
