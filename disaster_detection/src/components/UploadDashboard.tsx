'use client';

import { useState } from 'react';

export default function UploadDashboard() {
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
    <div className="p-4 md:p-8 w-full">
      <h2 className="text-2xl font-bold mb-6 text-zinc-900 border-b border-zinc-200 pb-3">
        Upload Image
      </h2>

      <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-lg shadow-sm">
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-3 text-zinc-800">
            Select an image for damage assessment:
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-zinc-700 bg-white border border-zinc-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {image && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase text-zinc-500 mb-2">
              Preview: {file?.name}
            </p>
            <div className="rounded-lg overflow-hidden border border-zinc-200 shadow-inner bg-white">
              <img
                src={image}
                alt="Upload preview"
                className="w-full h-auto object-contain max-h-[500px]"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
        >
          Upload and Analyze
        </button>
      </div>
    </div>
  );
}
