"use client";
import { useState } from "react";
export function PropertyGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [index, setIndex] = useState(0);
  return (
    <section aria-label="Property photographs">
      <div
        className="property-detail-hero"
        style={
          images[index]
            ? { backgroundImage: `url(${JSON.stringify(images[index])})` }
            : undefined
        }
        role="img"
        aria-label={
          images.length
            ? `${name}, photograph ${index + 1} of ${images.length}`
            : "Original architectural concept illustration"
        }
      >
        <span className="image-caption">
          {images.length
            ? "Approved property media"
            : "Architectural concept · not a property photograph"}
        </span>
      </div>
      {images.length > 1 && (
        <div className="gallery-controls">
          <p>
            {index + 1} of {images.length} · Images load only when selected.
            Lite Mode hides imagery.
          </p>
          <button
            type="button"
            className="button button-outline"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            Previous photograph
          </button>
          <button
            type="button"
            className="button button-outline"
            disabled={index === images.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            Next photograph
          </button>
        </div>
      )}
    </section>
  );
}
