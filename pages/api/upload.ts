import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function upload(req: NextApiRequest, res: NextApiResponse) {
  const form = formidable({
    uploadDir: path.join(process.cwd(), '/uploads'),
    keepExtensions: true,
  });

  form.parse(req, async (err: any, fields: Fields, files: Files) => {
    if (err) {
      console.error("Ошибка при парсинге формы:", err);
      res.status(500).json({ error: 'Ошибка загрузки файла' });
      return;
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      console.log("Файл не найден");
      res.status(400).json({ error: 'Файл не найден' });
      return;
    }

    try {
      console.log("Файл найден, начинается загрузка карты");
      const uploadUrl = await uploadMapImplAsync(fs.createReadStream(file.filepath), file.originalFilename || 'uploaded-map');
      
      if (uploadUrl) {
        console.log("Карта успешно загружена:", uploadUrl);
        res.status(200).json({ url: uploadUrl });
      } else {
        console.error("Не удалось загрузить карту");
        res.status(500).json({ error: 'Не удалось загрузить карту' });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      res.status(500).json({ error: 'Произошла ошибка при загрузке карты' });
    } finally {
      // Clean up the uploaded file to avoid leaving temporary files
      fs.unlink(file.filepath, (err) => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
      res.end();
    }
  });
}

async function uploadMapImplAsync(stream: fs.ReadStream, mapFileName: string): Promise<string | null> {
  const requestUri = `https://api.facepunch.com/api/public/rust-map-upload/${mapFileName}`;
  let retries = 0;

  while (retries < 10) {
    try {
      const response = await axios.put(requestUri, stream, {
        headers: {
          'Content-Type': 'application/octet-stream', // Так как загружается файл
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
