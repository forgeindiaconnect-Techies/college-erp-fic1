import crypto from 'crypto';

let cloudinarySdk = null;

// Try to dynamically load 'cloudinary' package if installed
try {
  const mod = await import('cloudinary');
  cloudinarySdk = mod.v2 || mod.default?.v2 || mod.default;
  if (cloudinarySdk && process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinarySdk.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
} catch (_e) {
  // SDK not yet installed, fallback to direct Cloudinary REST API
}

/**
 * Get current Cloudinary credentials from environment
 */
export const getCloudinaryCredentials = () => {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  };
};

/**
 * Verify Cloudinary connection and credentials
 */
export const verifyCloudinaryConnection = async () => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();

  if (!cloudName || !apiKey || !apiSecret) {
    const missing = [];
    if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!apiKey) missing.push('CLOUDINARY_API_KEY');
    if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');
    console.log(`⚠️ Cloudinary not connected: Missing ${missing.join(', ')} in backend/.env`);
    return {
      connected: false,
      error: `Missing environment variables: ${missing.join(', ')}`,
      cloudName: cloudName || null,
    };
  }

  // If SDK is loaded, verify using SDK ping
  if (cloudinarySdk && typeof cloudinarySdk.api?.ping === 'function') {
    try {
      const res = await cloudinarySdk.api.ping();
      if (res && res.status === 'ok') {
        console.log(`✅ Cloudinary connected successfully (Cloud Name: ${cloudName})`);
        return { connected: true, cloudName, sdk: true, status: 'ok' };
      }
    } catch (sdkErr) {
      // If SDK ping fails, try REST fallback to confirm
    }
  }

  // Direct REST API verification with Basic Auth
  try {
    const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'User-Agent': 'College-ERP-Cloudinary/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.status === 'ok') {
        console.log(`✅ Cloudinary connected successfully (Cloud Name: ${cloudName})`);
        return { connected: true, cloudName, sdk: !!cloudinarySdk, status: 'ok' };
      }
    }

    const errText = await response.text();
    console.log(`❌ Cloudinary connection failed: HTTP ${response.status} - ${errText}`);
    return {
      connected: false,
      cloudName,
      status: response.status,
      error: errText,
    };
  } catch (error) {
    console.log(`❌ Cloudinary connection error: ${error.message}`);
    return {
      connected: false,
      cloudName,
      error: error.message,
    };
  }
};

/**
 * Upload a file/buffer to Cloudinary
 */
export const uploadToCloudinary = async (fileData, options = {}) => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are not configured in backend/.env');
  }

  // Use SDK if available
  if (cloudinarySdk && typeof cloudinarySdk.uploader?.upload === 'function') {
    return await cloudinarySdk.uploader.upload(fileData, {
      folder: options.folder || 'college_erp',
      resource_type: options.resourceType || 'auto',
      ...options,
    });
  }

  // Direct REST API upload
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = options.folder || 'college_erp';
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  const formData = new FormData();
  if (typeof fileData === 'string' && (fileData.startsWith('data:') || fileData.startsWith('http'))) {
    formData.append('file', fileData);
  } else if (fileData instanceof Blob) {
    formData.append('file', fileData, options.filename || 'upload');
  } else if (Buffer.isBuffer(fileData)) {
    const blob = new Blob([fileData]);
    formData.append('file', blob, options.filename || 'upload');
  } else {
    formData.append('file', fileData);
  }

  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', folder);
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${options.resourceType || 'auto'}/upload`;
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to upload to Cloudinary');
  }

  return json;
};

export { cloudinarySdk as cloudinary };
export default {
  getCloudinaryCredentials,
  verifyCloudinaryConnection,
  uploadToCloudinary,
  cloudinary: cloudinarySdk,
};
