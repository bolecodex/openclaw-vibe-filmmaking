declare module "archiver" {
  import { Writable } from "stream";
  interface ArchiverOptions {
    zlib?: { level?: number };
  }
  interface Archiver {
    pipe<T extends Writable>(destination: T): T;
    directory(dir: string, name?: string): Archiver;
    finalize(): Promise<void>;
  }
  function archiver(format: string, options?: ArchiverOptions): Archiver;
  export default archiver;
}
