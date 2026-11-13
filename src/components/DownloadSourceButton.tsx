'use client';

import React from 'react';
import { Download } from 'lucide-react';

export const SOURCE_ZIP_URL = '/VeggieConnect3_2-source.zip';

/**
 * Compact icon button (Header / corner placements).
 * Serves the complete VeggieConnect3_2 source archive for download.
 */
export const DownloadSourceButton: React.FC<{ id?: string }> = ({ id = 'btn-download-source' }) => (
  <a
    id={id}
    href={SOURCE_ZIP_URL}
    download="VeggieConnect3_2-source.zip"
    className="w-8 h-8 min-h-[32px] rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white transition-colors cursor-pointer active:scale-95 flex-shrink-0 shadow-sm"
    title="Download source code (VeggieConnect3_2-source.zip)"
    aria-label="Download source code ZIP"
  >
    <Download className="w-4 h-4" />
  </a>
);

/**
 * Full-width pill for the login screen so the archive is always reachable
 * before signing in.
 */
export const DownloadSourcePill: React.FC<{ id?: string }> = ({ id = 'btn-download-source-pill' }) => (
  <a
    id={id}
    href={SOURCE_ZIP_URL}
    download="VeggieConnect3_2-source.zip"
    className="mt-3 w-full py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-900 text-[11px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.99]"
    title="Download the complete fixed source code (VeggieConnect3_2-source.zip)"
  >
    <Download className="w-4 h-4 text-emerald-700" />
    Download Source Code — VeggieConnect3_2-source.zip
  </a>
);
