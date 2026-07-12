export async function getCroppedImg(
  image: HTMLImageElement,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<string> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Set canvas size to match the bounding box
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight

  // Translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(image.naturalWidth / 2, image.naturalHeight / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2)

  // Draw rotated image
  ctx.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')

  if (!croppedCtx) {
    throw new Error('No 2d context')
  }

  // Set the size of the cropped canvas
  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  // Draw the cropped image onto the new canvas
  // We need to scale the pixelCrop (which is based on the rendered image)
  // to the natural size of the image.
  
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // As Base64 string
  return croppedCanvas.toDataURL('image/jpeg', 0.9);
}
