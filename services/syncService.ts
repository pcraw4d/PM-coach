
import { StoredInterview, User } from '../types';

/**
 * CLIENT_ID is now pulled from environment variables.
 * On Vercel, add "GOOGLE_CLIENT_ID" to your Environment Variables.
 */
const CLIENT_ID = (process.env as any).GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const FILE_NAME = 'pm_coach_cloud_data.json';

export interface SyncData {
  user: User;
  history: StoredInterview[];
  lastUpdated: number;
}

export class SyncService {
  private tokenClient: any = null;
  private gapiInited = false;
  private gisInited = false;

  constructor() {
    this.initScripts();
  }

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
        await (window as any).gapi.client.init({
          discoveryDocs: DISCOVERY_DOCS,
        });
        this.gapiInited = true;
      } catch (err) {
        console.error("GAPI init error:", err);
      }
    });
  }

  private initializeGis() {
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') return;
    try {
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined at request time
      });
      this.gisInited = true;
    } catch (err) {
      console.error("GIS init error:", err);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
      throw new Error("Client ID not configured. Please add GOOGLE_CLIENT_ID to your Environment Variables.");
    }

    // Re-init if it failed earlier due to missing ID
    if (!this.tokenClient) {
        this.initializeGis();
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient.callback = (resp: any) => {
          if (resp.error !== undefined) {
            reject(resp);
          }
          resolve(resp.access_token);
        };
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
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
        const fileContent = await (window as any).gapi.client.drive.files.get({
          fileId: fileId,
          alt: 'media',
        });
        cloudData = typeof fileContent.body === 'string' ? JSON.parse(fileContent.body) : fileContent.result;
      }

      let finalData = localData;
      if (cloudData && cloudData.lastUpdated > localData.lastUpdated) {
        const combinedHistory = [...localData.history];
        cloudData.history.forEach(cloudItem => {
          if (!combinedHistory.find(localItem => localItem.id === cloudItem.id)) {
            combinedHistory.push(cloudItem);
          }
        });
        
        finalData = {
          ...cloudData,
          history: combinedHistory.sort((a, b) => b.timestamp - a.timestamp)
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
          resource: { 
            name: FILE_NAME,
            mimeType: 'application/json' 
          },
          media: {
            mimeType: 'application/json',
            body: content,
          },
        });
      }

      return finalData;
    } catch (err: any) {
      console.error("Sync Error:", err);
      throw err;
    }
  }
}

export const syncService = new SyncService();
