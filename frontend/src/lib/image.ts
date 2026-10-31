/** Long edge of uploaded photos. Matches the backend; plenty for reading handwriting. */
const MAX_EDGE = 2400

/**
 * Shrink a camera photo before upload and apply its EXIF rotation, so phones on
 * slow connections send ~1 MB instead of ~5 MB. Falls back to the original file
 * when the browser cannot decode it; the server validates and converts it.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    )
    return blob ?? file
  } catch {
    return file
  }
}
