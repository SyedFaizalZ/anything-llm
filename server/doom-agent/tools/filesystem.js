const fs = require('fs');
const path = require('path');

class FileSystemTools {
  static safePath(filename) {
    const safe = path.resolve(process.cwd(), filename);
    if (!safe.startsWith(process.cwd())) {
        throw new Error("Path traversal is not allowed.");
    }
    return safe;
  }

  static async read_file({ filepath }) {
    try {
      const p = FileSystemTools.safePath(filepath);
      return fs.readFileSync(p, 'utf-8');
    } catch (e) {
      return `Error reading file: ${e.message}`;
    }
  }

  static async write_file({ filepath, content }) {
    try {
      const p = FileSystemTools.safePath(filepath);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content, 'utf-8');
      return `Successfully wrote to ${filepath}`;
    } catch (e) {
      return `Error writing file: ${e.message}`;
    }
  }

  static async append_file({ filepath, content }) {
    try {
      const p = FileSystemTools.safePath(filepath);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.appendFileSync(p, content, 'utf-8');
      return `Successfully appended to ${filepath}`;
    } catch (e) {
      return `Error appending to file: ${e.message}`;
    }
  }
}

module.exports = {
  read_file: FileSystemTools.read_file,
  write_file: FileSystemTools.write_file,
  append_file: FileSystemTools.append_file
};
