/** A one-pixel PNG, as `setInputFiles` takes it, for a file input that accepts images. */
export const pixelPng = (name = 'photo.png') => ({
    name,
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
});
