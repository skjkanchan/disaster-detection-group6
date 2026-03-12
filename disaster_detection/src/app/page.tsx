import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <main className="max-w-3xl w-full">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          Disaster Detection Landing Page
        </h1>
        <Link href="/upload">
          <button className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg">
            upload image page
          </button>
        </Link>
        <Link href="/chatbot">
          <button className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg">
            chatbot page
          </button>
        </Link>
        <Link href="/map">
          <button className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg">
            map page
          </button>
        </Link>
      </main>
    </div>
  );
}
