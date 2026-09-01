/**
 * Checks if a File object is accessible on the client file system.
 * Attempts to read a 1-byte slice. If the underlying file was moved, renamed,
 * or deleted on disk after being selected in an <input type="file">, this will fail.
 */
export async function isFileAccessible(file: File): Promise<boolean> {
    try {
        await file.slice(0, 1).arrayBuffer();

        return true;
    } catch {
        return false;
    }
}

/**
 * Validates a list of files.
 * Returns the name of the first inaccessible file found, or null if all files are accessible.
 */
export async function findInaccessibleFile(
    files: (File | null | undefined)[],
): Promise<string | null> {
    for (const file of files) {
        if (file instanceof File) {
            const accessible = await isFileAccessible(file);

            if (!accessible) {
                return file.name;
            }
        }
    }

    return null;
}
