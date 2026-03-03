import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  Heart, MessageCircle, Send, Plus, TrendingUp, Lightbulb, HelpCircle,
  Megaphone, Users, Clock, Trash2, Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface CommunityPost {
  id: string;
  user_id: string;
  company_id: string | null;
  title: string;
  content: string;
  category: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name?: string;
  liked_by_me?: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

const CATEGORIES = [
  { value: 'general', label: 'Geral', icon: <Megaphone className="w-4 h-4" /> },
  { value: 'dicas', label: 'Dicas', icon: <Lightbulb className="w-4 h-4" /> },
  { value: 'crescimento', label: 'Crescimento', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'ajuda', label: 'Ajuda', icon: <HelpCircle className="w-4 h-4" /> },
  { value: 'networking', label: 'Networking', icon: <Users className="w-4 h-4" /> },
];

const getCategoryInfo = (value: string) => CATEGORIES.find(c => c.value === value) || CATEGORIES[0];

const CommunityPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch author names
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        profiles?.forEach(p => { profileMap[p.id] = p.full_name; });
      }

      // Check which posts user liked
      let likedPostIds: Set<string> = new Set();
      if (user?.id) {
        const { data: likes } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('user_id', user.id);
        likes?.forEach(l => likedPostIds.add(l.post_id));
      }

      setPosts((data || []).map(p => ({
        ...p,
        author_name: profileMap[p.user_id] || 'Utilizador',
        liked_by_me: likedPostIds.has(p.id),
      })));
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, [filterCategory]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('community-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        fetchPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filterCategory]);

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({ title: 'Preencha título e conteúdo', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('community_posts').insert({
        user_id: user!.id,
        company_id: (user as any)?.company_id || null,
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
      });
      if (error) throw error;
      toast({ title: 'Post publicado!' });
      setNewTitle('');
      setNewContent('');
      setNewCategory('general');
      setNewPostOpen(false);
      fetchPosts();
    } catch (err: any) {
      toast({ title: 'Erro ao publicar', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const { data, error } = await supabase.rpc('toggle_post_like', { p_post_id: postId });
      if (error) throw error;
      const result = data as any;
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, liked_by_me: result.liked, likes_count: p.likes_count + (result.liked ? 1 : -1) }
          : p
      ));
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const fetchComments = async (postId: string) => {
    const { data, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) return;

    const userIds = [...new Set((data || []).map(c => c.user_id))];
    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      profiles?.forEach(p => { profileMap[p.id] = p.full_name; });
    }

    setComments(prev => ({
      ...prev,
      [postId]: (data || []).map(c => ({ ...c, author_name: profileMap[c.user_id] || 'Utilizador' }))
    }));
  };

  const handleToggleComments = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      fetchComments(postId);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;
    try {
      const { error } = await supabase.rpc('add_community_comment', { p_post_id: postId, p_content: text });
      if (error) throw error;
      setCommentText(prev => ({ ...prev, [postId]: '' }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
      fetchComments(postId);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from('community_posts').delete().eq('id', postId);
      if (error) throw error;
      toast({ title: 'Post eliminado' });
      fetchPosts();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comunidade Empreendedora</h1>
          <p className="text-sm text-muted-foreground">Partilhe ideias, dicas e conecte-se com outros empreendedores</p>
        </div>
        <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Publicar</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Publicação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Título</Label>
                <Input
                  placeholder="Título do post..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">{c.icon} {c.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conteúdo</Label>
                <Textarea
                  placeholder="Partilhe a sua experiência, dica ou pergunta..."
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleCreatePost} disabled={submitting}>
                {submitting ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterCategory('all')}
        >
          <Filter className="w-3 h-3 mr-1" /> Todos
        </Button>
        {CATEGORIES.map(c => (
          <Button
            key={c.value}
            variant={filterCategory === c.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterCategory(c.value)}
          >
            {c.icon}
            <span className="ml-1">{c.label}</span>
          </Button>
        ))}
      </div>

      {/* Posts Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">Nenhuma publicação ainda</h3>
            <p className="text-sm text-muted-foreground mt-1">Seja o primeiro a partilhar algo!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map(post => {
            const catInfo = getCategoryInfo(post.category);
            const isExpanded = expandedPost === post.id;
            const postComments = comments[post.id] || [];

            return (
              <Card key={post.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {(post.author_name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm text-foreground">{post.author_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: pt })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {catInfo.icon}
                        <span className="ml-1">{catInfo.label}</span>
                      </Badge>
                      {post.user_id === user?.id && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeletePost(post.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <h3 className="font-semibold text-foreground mb-1">{post.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.content}</p>

                  <Separator className="my-3" />

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={post.liked_by_me ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'}
                      onClick={() => handleToggleLike(post.id)}
                    >
                      <Heart className={`w-4 h-4 mr-1 ${post.liked_by_me ? 'fill-current' : ''}`} />
                      {post.likes_count}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => handleToggleComments(post.id)}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      {post.comments_count}
                    </Button>
                  </div>

                  {/* Comments section */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3">
                      <Separator />
                      {postComments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-2 pl-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-muted">
                              {(comment.author_name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-muted/50 rounded-lg p-2">
                            <p className="text-xs font-medium text-foreground">{comment.author_name}</p>
                            <p className="text-sm text-muted-foreground">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Escreva um comentário..."
                          value={commentText[post.id] || ''}
                          onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                          className="text-sm"
                        />
                        <Button size="icon" variant="ghost" onClick={() => handleAddComment(post.id)}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
