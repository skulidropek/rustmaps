export interface MapEntry {
    name: string;
    url: string;
    timestamp: string;
}

export default class LinkManager {
    private static storageKey = 'uploadedMaps';

    static getLinks(): MapEntry[] {
        const storedLinks = localStorage.getItem(this.storageKey);
        return storedLinks ? JSON.parse(storedLinks) : [];
    }

    static addLink(name: string, url: string): void {
        const links = this.getLinks();
        const timestamp = new Date().toISOString();  // Текущее время в формате ISO
        links.push({ name, url, timestamp });
        localStorage.setItem(this.storageKey, JSON.stringify(links));
    }

    static clearLinks(): void {
        localStorage.removeItem(this.storageKey);
    }
}
