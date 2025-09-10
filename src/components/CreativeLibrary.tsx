import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Search, 
  Filter, 
  Image, 
  Video, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Download,
  Share,
  RefreshCw,
  Tag,
  BarChart3
} from 'lucide-react';

interface CreativeAsset {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_size: number;
  tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

const CreativeLibrary = () => {
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<CreativeAsset | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    tags: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('creative_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAssets(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar biblioteca",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!uploadForm.title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, adicione um título para o arquivo.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('creative-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('creative-assets')
        .getPublicUrl(fileName);

      const tagsArray = uploadForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      const { error: insertError } = await supabase
        .from('creative_assets')
        .insert({
          user_id: user.id,
          title: uploadForm.title,
          description: uploadForm.description,
          file_url: urlData.publicUrl,
          file_type: file.type.startsWith('image/') ? 'image' : 'video',
          file_size: file.size,
          tags: tagsArray,
          status: uploadForm.status
        });

      if (insertError) throw insertError;

      toast({
        title: "Upload realizado com sucesso!",
        description: "O arquivo foi adicionado à biblioteca de criativos.",
      });

      setUploadForm({ title: '', description: '', tags: '', status: 'draft' });
      setIsUploadDialogOpen(false);
      fetchAssets();
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    try {
      const { error } = await supabase
        .from('creative_assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;

      toast({
        title: "Criativo removido",
        description: "O arquivo foi removido da biblioteca.",
      });

      fetchAssets();
    } catch (error: any) {
      toast({
        title: "Erro ao remover criativo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (assetId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('creative_assets')
        .update({ status: newStatus })
        .eq('id', assetId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "O status do criativo foi atualizado com sucesso.",
      });

      fetchAssets();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || asset.file_type === filterType;
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending_approval': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'pending_approval': return 'Aguardando Aprovação';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Reprovado';
      default: return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando biblioteca...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Biblioteca de Criativos
        </h1>
        <p className="text-muted-foreground">
          Centralize, organize e gerencie todos seus ativos criativos em um só lugar
        </p>
      </div>

      {/* Filters and Upload */}
      <Card className="bg-gradient-card border-border shadow-card mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por título, descrição ou tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="image">Imagens</SelectItem>
                  <SelectItem value="video">Vídeos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="pending_approval">Aguardando</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchAssets}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-primary">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Upload de Criativo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="title">Título *</Label>
                      <Input
                        id="title"
                        value={uploadForm.title}
                        onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                        placeholder="Digite o título do criativo"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={uploadForm.description}
                        onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                        placeholder="Adicione uma descrição..."
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                      <Input
                        id="tags"
                        value={uploadForm.tags}
                        onChange={(e) => setUploadForm({...uploadForm, tags: e.target.value})}
                        placeholder="campanha, verão, promoção"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={uploadForm.status} onValueChange={(value) => setUploadForm({...uploadForm, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                          <SelectItem value="approved">Aprovado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Arquivo</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline" 
                        className="w-full"
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Fazendo upload...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Selecionar Arquivo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAssets.length === 0 ? (
          <div className="col-span-full">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardContent className="p-12 text-center">
                <div className="text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum criativo encontrado</h3>
                  <p className="mb-4">Faça upload de imagens e vídeos para começar a construir sua biblioteca.</p>
                  <Button onClick={() => setIsUploadDialogOpen(true)} className="bg-gradient-primary">
                    <Upload className="h-4 w-4 mr-2" />
                    Fazer Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <Card key={asset.id} className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-all duration-300 group">
              <div className="relative aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                {asset.file_type === 'image' ? (
                  <img 
                    src={asset.file_url} 
                    alt={asset.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <Video className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="secondary">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="secondary">
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="absolute top-2 right-2">
                  <Badge variant={getStatusBadgeVariant(asset.status)} className="text-xs">
                    {getStatusLabel(asset.status)}
                  </Badge>
                </div>
                
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    {asset.file_type === 'image' ? <Image className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
                    {asset.file_type === 'image' ? 'IMG' : 'VID'}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-medium text-foreground mb-2 line-clamp-2">{asset.title}</h3>
                
                {asset.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{asset.description}</p>
                )}
                
                {asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {asset.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Tag className="h-2 w-2 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                    {asset.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{asset.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>{formatFileSize(asset.file_size)}</span>
                  <span>{new Date(asset.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <Select 
                    value={asset.status} 
                    onValueChange={(value) => handleStatusUpdate(asset.id, value)}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1 mr-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="pending_approval">Aguardando</SelectItem>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="rejected">Reprovado</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Asset Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{selectedAsset?.title}</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                {selectedAsset.file_type === 'image' ? (
                  <img 
                    src={selectedAsset.file_url} 
                    alt={selectedAsset.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video 
                    src={selectedAsset.file_url}
                    controls
                    className="w-full h-full"
                  />
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Descrição</Label>
                  <p className="text-sm text-muted-foreground">{selectedAsset.description || 'Sem descrição'}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedAsset.status)}>
                    {getStatusLabel(selectedAsset.status)}
                  </Badge>
                </div>
                <div>
                  <Label>Tamanho</Label>
                  <p className="text-sm text-muted-foreground">{formatFileSize(selectedAsset.file_size)}</p>
                </div>
                <div>
                  <Label>Criado em</Label>
                  <p className="text-sm text-muted-foreground">{new Date(selectedAsset.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              
              {selectedAsset.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedAsset.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreativeLibrary;