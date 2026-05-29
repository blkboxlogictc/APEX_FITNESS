'use client'

export interface ProcessedImage {
  base64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  sizeKb: number
  width: number
  height: number
}

const MAX_DIM = 1500
const MAX_SEND_KB = 800
const JPEG_INITIAL_QUALITY = 0.85

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function fileToDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function processImageForVision(
  input: File | Blob | string
): Promise<ProcessedImage> {
  let dataURL: string
  let mimeType: ProcessedImage['mimeType'] = 'image/jpeg'

  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      dataURL = input
      const match = input.match(/data:(image\/\w+);/)
      if (match) mimeType = match[1] as ProcessedImage['mimeType']
    } else {
      dataURL = `data:image/jpeg;base64,${input}`
    }
  } else {
    if (input instanceof File && input.type) {
      mimeType = input.type as ProcessedImage['mimeType']
    }
    dataURL = await fileToDataURL(input)
  }

  const img = await loadImage(dataURL)
  let { naturalWidth: w, naturalHeight: h } = img

  // Resize if too large
  if (Math.max(w, h) > MAX_DIM) {
    if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM }
    else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM }
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)

  // Compress
  let quality = JPEG_INITIAL_QUALITY
  let blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', quality))

  while (blob.size > MAX_SEND_KB * 1024 && quality > 0.3) {
    quality = Math.max(quality - 0.1, 0.3)
    blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', quality))
  }

  const base64 = await blobToBase64(blob)

  return {
    base64,
    mimeType: 'image/jpeg',
    sizeKb: Math.round(blob.size / 1024),
    width: w,
    height: h,
  }
}

export function dataURLtoBase64(dataURL: string): string {
  return dataURL.split(',')[1] ?? dataURL
}

export function base64ToDataURL(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`
}

export async function captureFromCamera(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.setAttribute('capture', 'environment')
    input.onchange = () => resolve(input.files?.[0] ?? null)
    // Some browsers don't fire oncancel — resolve null after blur
    const onBlur = () => { setTimeout(() => resolve(null), 300) }
    window.addEventListener('focus', onBlur, { once: true })
    input.click()
  })
}

export async function compressImage(file: File, maxSizeKb: number): Promise<Blob> {
  const dataURL = await fileToDataURL(file)
  const img = await loadImage(dataURL)

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  let quality = 0.9
  let blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', quality))

  while (blob.size > maxSizeKb * 1024 && quality > 0.2) {
    quality = Math.max(quality - 0.1, 0.2)
    blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', quality))
  }

  return blob
}
