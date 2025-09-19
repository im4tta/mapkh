"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Image, Video, Download, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EvidenceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  driveLink: string;
  reportNumber: number;
}

export function EvidenceDialog({ isOpen, onClose, driveLink, reportNumber }: EvidenceDialogProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  // Extract folder ID from Google Drive link
  const getFolderId = (link: string) => {
    const match = link.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  // Generate embed URL for Google Drive folder
  const getEmbedUrl = (link: string) => {
    const folderId = getFolderId(link);
    if (folderId) {
      return `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
    }
    return null;
  };

  const embedUrl = getEmbedUrl(driveLink);

  const handleOpenInNewTab = () => {
    window.open(driveLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Evidence Files - Report #{reportNumber}
          </DialogTitle>
          <DialogDescription>
            View evidence files for this report. You can browse files below or open in Google Drive.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 mb-4">
          <Button onClick={handleOpenInNewTab} variant="outline" size="sm">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Google Drive
          </Button>
        </div>

        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              title={`Evidence files for Report #${reportNumber}`}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Preview Files</h3>
              <p className="text-muted-foreground mb-4">
                The evidence folder cannot be embedded. Please use the button above to open it in Google Drive.
              </p>
              <Button onClick={handleOpenInNewTab} variant="default">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in Google Drive
              </Button>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground mt-2">
          <p>
            <strong>Note:</strong> Some files may require Google Drive permissions to view. 
            If you cannot see the files, please use the "Open in Google Drive" button above.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}