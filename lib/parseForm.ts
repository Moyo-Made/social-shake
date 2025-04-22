import { NextRequest } from 'next/server';
import formidable from 'formidable';
import { Readable } from 'stream';
import { IncomingMessage } from 'http';

export async function parseForm(req: NextRequest) {
  return new Promise<{
    fields: Record<string, string | number | boolean>;
    files: Record<string, formidable.File[]>;
  }>(async (resolve, reject) => {
    // Convert request body to a mock IncomingMessage
    const body = await req.text(); // Convert req.body to a string
    const mockReq = Object.assign(new Readable(), {
      headers: req.headers,
      method: req.method,
      url: req.url,
    });
    mockReq._read = () => {};
    mockReq.push(Buffer.from(body));
    mockReq.push(null);

    const form = formidable({
      multiples: true,
      keepExtensions: true,
    });

    form.parse(mockReq as unknown as IncomingMessage, (err: Error | null, fields: formidable.Fields, files: formidable.Files) => {
      if (err) {
        reject(err);
        return;
      }
      const transformedFields: Record<string, string | number | boolean> = {};
      for (const key in fields) {
        const value = fields[key];
        if (Array.isArray(value)) {
          transformedFields[key] = value.join(','); // Convert array to a comma-separated string
        } else if (value !== undefined) {
          transformedFields[key] = value; // Assign the value directly if it's not undefined
        }
      }
      const transformedFiles: Record<string, formidable.File[]> = {};
      for (const key in files) {
        const fileArray = files[key];
        if (Array.isArray(fileArray)) {
          transformedFiles[key] = fileArray; // Assign directly if it's an array
        }
      }
      resolve({ fields: transformedFields, files: transformedFiles });
    });
  });
}