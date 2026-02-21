import { HistoryItem, User, KnowledgeMission, SyncData } from '../types.ts';

const getEnv = (name: string): string => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[name]) return process.env[name] as string;
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[name]) return metaEnv[name] as string;
  } catch (e) {}
  return '';
};

const CLIENT_ID = getEnv('GOOGLE_CLIENT_ID') || 'YOUR_GOOGLE_CLIENT_ID'; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const FILE_NAME = 'pm_coach_cloud_data.json';

export class SyncService {
  private tokenClient: any = null;
  private gapiInited = false;
  private gisInited = false;

  constructor() { this.initScripts(); }

  private initScripts() {
    if (typeof window === 'undefined') return;
    const checkInit = () => {
      if ((window as any).gapi && (window as any).google) {
        this.initializeGapi();
        this.initializeGis();
      } else {
        setTimeout(checkInit, 100);
      }
    };
    checkInit();
  }

  private initializeGapi() {
    (window as any).gapi.load('client', async () => {
      try {
        await (window as any).gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });
        this.gapiInited = true;
      } catch (err) {}
    });
  }

  private initializeGis() {
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') return;
    try {
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
      });
      this.gisInited = true;
    } catch (err) {}
  }

  private async getAccessToken(): Promise<string> {
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') throw new Error("Client ID required");
    if (!this.tokenClient) this.initializeGis();

    return new Promise((resolve, reject) => {
      this.tokenClient.callback = (resp: any) => {
        if (resp.error) reject(resp);
        resolve(resp.access_token);
      };
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  async sync(localData: SyncData): Promise<SyncData> {
    try {
      await this.getAccessToken();
      const response = await (window as any).gapi.client.drive.files.list({
        q: `name = '${FILE_NAME}' and trashed = false`,
        fields: 'files(id, name)',
      });

      const files = response.result.files;
      let cloudData: SyncData | null = null;
      let fileId = '';

      if (files && files.length > 0) {
        fileId = files[0].id;
        const fileContent = await (window as any).gapi.client.drive.files.get({ fileId, alt: 'media' });
        cloudData = typeof fileContent.body === 'string' ? JSON.parse(fileContent.body) : fileContent.result;
      }

      let finalData = { ...localData };

      if (cloudData && cloudData.lastUpdated > localData.lastUpdated) {
        // Merge history
        const historyMap = new Map();
        [...localData.history, ...cloudData.history].forEach(item => historyMap.set(item.id, item));
        
        // Merge missions
        const missionsMap = new Map();
        const allMissions = [...(localData.missions || []), ...(cloudData.missions || [])];
        allMissions.forEach(m => {
          const existing = missionsMap.get(m.id);
          if (existing) {
            missionsMap.set(m.id, { ...m, isCompleted: existing.isCompleted || m.isCompleted });
          } else {
            missionsMap.set(m.id, m);
          }
        });

        finalData = {
          ...cloudData,
          history: Array.from(historyMap.values()).sort((a, b) => b.timestamp - a.timestamp),
          missions: Array.from(missionsMap.values())
        };
      }

      finalData.lastUpdated = Date.now();
      const content = JSON.stringify(finalData);

      if (fileId) {
        await (window as any).gapi.client.request({
          path: `/upload/drive/v3/files/${fileId}`,
          method: 'PATCH',
          params: { uploadType: 'media' },
          body: content,
        });
      } else {
        await (window as any).gapi.client.drive.files.create({
          resource: { name: FILE_NAME, mimeType: 'application/json' },
          media: { mimeType: 'application/json', body: content },
        });
      }

      return finalData;
    } catch (err) {
      throw err;
    }
  }
}

export const syncService = new SyncService();
