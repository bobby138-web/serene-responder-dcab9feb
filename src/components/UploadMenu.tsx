import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Image, FileText, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface UploadMenuProps {
  sessionId: string | null;
  onUpload?: () => void;
  onWebSearch?: (query: string) => void;
}

export const UploadMenu = ({ sessionId, onUpload, onWebSearch }: UploadMenuProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileUpload = async (file: File, type: 'image' | 'file') => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload files",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const folder = type === 'image' ? 'images' : 'files';
      const filePath = `${user.id}/${folder}/${timestamp}_${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('user_uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_uploads')
        .getPublicUrl(filePath);

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('media_library')
        .insert({
          session_id: sessionId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
        });

      if (dbError) throw dbError;

      toast({
        title: "Upload successful",
        description: file.name,
      });

      onUpload?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = () => {
    imageInputRef.current?.click();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onWebSearch?.(searchQuery);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            type="button"
            size="icon" 
            variant="ghost"
            disabled={uploading}
            className="shrink-0"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={handleImageSelect}>
            <Image className="h-4 w-4 mr-2" />
            Upload Image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleFileSelect}>
            <FileText className="h-4 w-4 mr-2" />
            Upload File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSearchOpen(true)}>
            <Search className="h-4 w-4 mr-2" />
            Web Search
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, 'image');
          e.target.value = '';
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, 'file');
          e.target.value = '';
        }}
      />

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Web Search</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <Input
              placeholder="Enter search query..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
