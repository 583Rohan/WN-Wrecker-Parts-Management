using System.Text.RegularExpressions;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace WnWrecker.Api.Services
{
    // Uploads and deletes part photos on Cloudinary.
    // Keys come from configuration (User Secrets locally, environment variables when hosted):
    //   Cloudinary:CloudName, Cloudinary:ApiKey, Cloudinary:ApiSecret
    public class PhotoStorage
    {
        private const string Folder = "wnwrecker/parts";
        private readonly Cloudinary? _cloudinary;

        public PhotoStorage(IConfiguration config)
        {
            var cloud = config["Cloudinary:CloudName"];
            var key = config["Cloudinary:ApiKey"];
            var secret = config["Cloudinary:ApiSecret"];

            if (!string.IsNullOrWhiteSpace(cloud) && !string.IsNullOrWhiteSpace(key) && !string.IsNullOrWhiteSpace(secret))
            {
                _cloudinary = new Cloudinary(new Account(cloud, key, secret));
                _cloudinary.Api.Secure = true;                       // always https links
            }
        }

        public bool IsConfigured => _cloudinary != null;

        // uploads the image (shrunk to max 1600px and compressed) and returns its https URL
        public async Task<string> UploadAsync(IFormFile file)
        {
            if (_cloudinary == null)
                throw new InvalidOperationException("Photo storage isn't set up (Cloudinary keys missing).");

            await using var stream = file.OpenReadStream();
            var result = await _cloudinary.UploadAsync(new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = Folder,
                PublicId = Guid.NewGuid().ToString("N"),
                // resize big phone photos and compress them before storing — keeps the shop fast
                Transformation = new Transformation().Width(1600).Height(1600).Crop("limit").Quality("auto:good"),
            });

            if (result.Error != null)
                throw new InvalidOperationException($"Cloudinary upload failed: {result.Error.Message}");

            return result.SecureUrl.ToString();
        }

        // deletes a photo we uploaded earlier; quietly ignores old/non-Cloudinary links
        public async Task DeleteAsync(string? photoUrl)
        {
            if (_cloudinary == null || string.IsNullOrWhiteSpace(photoUrl)) return;
            var publicId = PublicIdFromUrl(photoUrl);
            if (publicId == null) return;
            await _cloudinary.DestroyAsync(new DeletionParams(publicId) { Invalidate = true });   // also clears Cloudinary's cached copy
        }

        // https://res.cloudinary.com/<cloud>/image/upload/v123/wnwrecker/parts/abc.jpg  ->  wnwrecker/parts/abc
        private static string? PublicIdFromUrl(string url)
        {
            if (!url.Contains("res.cloudinary.com")) return null;
            var match = Regex.Match(url, @"/upload/(?:[^/]+/)*?(?:v\d+/)?(" + Regex.Escape(Folder) + @"/[^.?#]+)");
            return match.Success ? match.Groups[1].Value : null;
        }
    }
}