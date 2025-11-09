import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    created_at: string;
  } | null;
  onDelete?: () => void;
}

export const FilePreviewModal = ({ open, onOpenChange, file, onDelete }: FilePreviewModalProps) => {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  if (!file) return null;

  const isImage = file.file_type.startsWith('image/');
  const isPDF = file.file_type === 'application/pdf';
  const isText = file.file_type === 'text/plain';

  const handleDownload = async () => {
    try {
      const link = document.createElement('a');
      link.href = file.file_url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: file.file_name,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this file permanently?")) return;
    
    setDeleting(true);
    try {
      // Extract file path from URL
      const urlParts = file.file_url.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('user_uploads') + 1).join('/');
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user_uploads')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_library')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: "File deleted",
        description: file.file_name,
      });

      onDelete?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Delete failed",
        description: "Could not delete file",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate flex-1">{file.file_name}</span>
            <div className="flex gap-2 ml-4">
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleDelete}
                disabled={deleting}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isImage && (
            <img 
              src={file.file_url} 
              alt={file.file_name}
              className="w-full h-auto rounded-lg"
            />
          )}

          {isPDF && (
            <iframe
              src={file.file_url}
              className="w-full h-[70vh] rounded-lg"
              title={file.file_name}
            />
          )}

          {isText && (
            <div className="bg-muted p-4 rounded-lg">
              <iframe
                src={file.file_url}
                className="w-full h-[60vh] bg-background"
                title={file.file_name}
              />
            </div>
          )}

          {!isImage && !isPDF && !isText && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Preview not available for this file type
              </p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground mt-2">
          Uploaded: {new Date(file.created_at).toLocaleString()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
