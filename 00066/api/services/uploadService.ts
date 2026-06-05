export class UploadService {
  async handleUpload(file: any) { return file }
  async getFileMetadata(fileId: string) { return null }
  async deleteFile(fileId: string) { return true }
}

export default new UploadService()
