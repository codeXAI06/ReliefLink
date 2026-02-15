import { useState, useRef } from 'react';

/**
 * ImageUploader - Photo evidence upload for disaster requests
 * Supports camera capture and gallery selection (up to 3 images)
 */
function ImageUploader({ images, onImagesChange }) {
  const fileInputRef = useRef(null);
  const [previews, setPreviews] = useState([]);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    const total = (images?.length || 0) + files.length;
    
    if (total > 3) {
      alert('Maximum 3 images allowed');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validFiles = files.filter(f => validTypes.includes(f.type));
    
    if (validFiles.length !== files.length) {
      alert('Only JPEG, PNG, and WebP images are allowed');
    }

    // Create previews
    const newPreviews = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    const updated = [...previews, ...newPreviews].slice(0, 3);
    setPreviews(updated);
    onImagesChange(updated.map(p => p.file));
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index].url);
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onImagesChange(updated.map(p => p.file));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        📷 Photo Evidence <span className="text-gray-400 font-normal">(optional, max 3)</span>
      </label>
      
      {/* Preview Grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
              <img
                src={preview.url}
                alt={`Evidence ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                aria-label={`Remove image ${index + 1}`}
              >
                ×
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 text-center">
                {(preview.file.size / 1024).toFixed(0)} KB
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Button */}
      {previews.length < 3 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            <span className="text-xl">📸</span>
            <span className="text-sm font-medium">
              {previews.length === 0 ? 'Add damage photos' : `Add more (${3 - previews.length} left)`}
            </span>
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        className="hidden"
        aria-label="Upload damage photos"
      />
      
      <p className="text-xs text-gray-400">
        Photos help responders prepare appropriate supplies and assess damage severity
      </p>
    </div>
  );
}

export default ImageUploader;
