import axios, { AxiosResponse } from 'axios';

export class MapUploader {
    private static http = axios.create();

    public static async uploadMapAsync(file: File): Promise<string | null> {
        if (!file) {
            throw new Error('File is required.');
        }

        return await this.uploadMapImplAsync(file, file.name);
    }

    private static async uploadMapImplAsync(file: File, mapFileName: string): Promise<string | null> {
        const requestUri = `/api/public/rust-map-upload/${mapFileName}`;
        let retries = 0;

        while (retries < 10) {
            try {
                const response: AxiosResponse<string> = await this.http.put(requestUri, file, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                    },
                });

                if (response.status >= 200 && response.status < 300) {
                    const responseBody = response.data;
                    if (!responseBody || !responseBody.startsWith('http')) {
                        throw new Error('Backend sent an invalid success response when uploading the map.');
                    }
                    return responseBody;
                } else if (response.status >= 400 && response.status < 500) {
                    return null;
                }
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 1000 + retries * 5000));
                retries++;
            }
        }

        return null;
    }
}
