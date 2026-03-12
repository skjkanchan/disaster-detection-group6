'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function UploadPage() {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select an image first');
      return;
    }
    // TODO: Add upload logic here
    console.log('Uploading file:', file.name);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <main className="max-w-3xl mx-auto">
        <Link href="/">
          <button className="mb-6 px-4 py-2 bg-gray-500 text-white rounded-lg ">
            ← Back
          </button>
        </Link>

        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          Upload Image
        </h1>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
          <div className="mb-6">
            <label className="block text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Select an image:
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-gray-700 border border-gray-300 rounded-lg p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>

          {image && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {file?.name}
              </p>
              <img
                src={image}
                alt="Preview"
                className="max-w-full h-auto rounded-lg border border-gray-300 dark:border-gray-600"
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            className="w-full px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg "
          >
            Upload
          </button>
        </div>
      </main>
    </div>
  );
}
