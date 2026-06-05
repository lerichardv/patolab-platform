<?php

namespace App\Services;

use Illuminate\Http\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageOptimizerService
{
    /**
     * Optimize an uploaded image to stay under 300KB and store it on the specified disk.
     *
     * @param UploadedFile $file
     * @param string $folder
     * @param string $disk
     * @return string Stored file path relative to disk root
     */
    public function optimizeAndStore(UploadedFile $file, string $folder, string $disk = 'public'): string
    {
        $mime = $file->getMimeType();

        // If it's not a GD-supported image, save it directly
        if (!str_starts_with($mime, 'image/')) {
            return $file->store($folder, $disk);
        }

        $gdImage = null;
        if ($mime === 'image/jpeg' || $mime === 'image/jpg') {
            $gdImage = @imagecreatefromjpeg($file->getRealPath());
        } elseif ($mime === 'image/png') {
            $gdImage = @imagecreatefrompng($file->getRealPath());
        } elseif ($mime === 'image/gif') {
            $gdImage = @imagecreatefromgif($file->getRealPath());
        } elseif ($mime === 'image/webp') {
            if (function_exists('imagecreatefromwebp')) {
                $gdImage = @imagecreatefromwebp($file->getRealPath());
            }
        }

        // If GD image load failed, save it directly
        if (!$gdImage) {
            return $file->store($folder, $disk);
        }

        $originalWidth = imagesx($gdImage);
        $originalHeight = imagesy($gdImage);

        // Minimum limit dimensions (1000px)
        $minScale = 1.0;
        if ($originalWidth > 1000 && $originalHeight > 1000) {
            $minScale = max(1000 / $originalWidth, 1000 / $originalHeight);
        }

        $quality = 90;
        $scale = 1.0;
        $tempPath = tempnam(sys_get_temp_dir(), 'img_opt_');

        while (true) {
            $w = (int) ($originalWidth * $scale);
            $h = (int) ($originalHeight * $scale);

            $tmpImg = imagecreatetruecolor($w, $h);
            
            // Handle transparency for PNG/WebP or fallback to white fill
            imagefill($tmpImg, 0, 0, imagecolorallocate($tmpImg, 255, 255, 255));
            imagecopyresampled($tmpImg, $gdImage, 0, 0, 0, 0, $w, $h, $originalWidth, $originalHeight);

            imagejpeg($tmpImg, $tempPath, $quality);
            imagedestroy($tmpImg);

            $filesize = filesize($tempPath);

            // Stop if filesize is under 300KB
            if ($filesize <= 300 * 1024) {
                break;
            }

            if ($scale > $minScale) {
                $scale = max($minScale, $scale - 0.1);
                continue;
            }

            if ($quality > 10) {
                $quality -= 10;
                continue;
            }

            break;
        }

        imagedestroy($gdImage);

        $filename = Str::random(40) . '.jpg';
        Storage::disk($disk)->putFileAs($folder, new File($tempPath), $filename);
        @unlink($tempPath);

        return $folder . '/' . $filename;
    }
}
