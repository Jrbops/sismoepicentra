// Uygulama güncelleme kontrolü
export const useAppUpdate = () => {
  const currentVersion = '1.0.0'; // package.json'dan al
  
  async function checkForUpdate() {
    try {
      const response = await fetch('https://epicentra-c38yv5e9d-toprak-ayvazs-projects.vercel.app/api/version');
      const data = await response.json();
      
      if (data.version !== currentVersion) {
        return {
          hasUpdate: true,
          latestVersion: data.version,
          downloadUrl: data.downloadUrl,
          changelog: data.changelog
        };
      }
      
      return { hasUpdate: false };
    } catch (error) {
      console.error('Update check failed:', error);
      return { hasUpdate: false };
    }
  }
  
  return {
    checkForUpdate
  };
};
