import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files, File } from 'formidable';
import fs from 'fs';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function upload(req: NextApiRequest, res: NextApiResponse) {
  const form = formidable({
    keepExtensions: true,
  });

  form.parse(req, async (err: any, fields: Fields, files: Files) => {
    if (err) {
      console.error("Error parsing the form:", err);
      res.status(500).json({ error: 'Error uploading file' });
      return;
    }

    const file = Array.isArray(files.file) ? files.file[0] : (files.file as File | undefined);

    if (!file) {
      console.log("File not found");
      res.status(400).json({ error: 'File not found' });
      return;
    }

    if (!('filepath' in file)) {
      console.error("Filepath not found");
      res.status(500).json({ error: 'Filepath not found' });
      return;
    }

    try {
      console.log("File found, starting map upload");

      const fileStream = fs.createReadStream(file.filepath);

      const uploadUrl = await uploadMapImplAsync(fileStream, file.originalFilename || 'uploaded-map');

      if (uploadUrl) {
        console.log("Map successfully uploaded:", uploadUrl);
        res.status(200).json({ url: uploadUrl });
      } else {
        console.error("Failed to upload map");
        res.status(500).json({ error: 'Failed to upload map' });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      res.status(500).json({ error: 'An error occurred while uploading the map' });
    } finally {
      fs.unlink(file.filepath, (err) => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
      res.end();
    }
  });
}

async function uploadMapImplAsync(fileStream: fs.ReadStream, mapFileName: string): Promise<string | null> {
  const requestUri = `https://api.facepunch.com/api/public/rust-map-upload/${mapFileName}`;
  let retries = 0;

  while (retries < 10) {
    try {
      const response = await axios.put(requestUri, fileStream, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (response.status >= 200 && response.status < 300) {
        const responseBody = response.data;
        if (!responseBody || !responseBody.startsWith("http")) {
          throw new Error("Backend sent an invalid success response when uploading the map.");
        }
        return responseBody;
      } else if (response.status >= 400 && response.status < 500) {
        return null;
      } else {
        response.statusText;
      }
    } catch (error) {
      console.error(`Attempt ${retries + 1}: Upload failed with error:`, error);
      await new Promise(resolve => setTimeout(resolve, 1000 + retries * 5000));
      retries++;
    }
  }

  return null;
}
