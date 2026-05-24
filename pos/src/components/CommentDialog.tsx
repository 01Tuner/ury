import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui';
import { Textarea } from './ui/textarea';
import { t } from '../i18n';

interface CommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (comment: string) => void;
  initialComment?: string;
}

const CommentDialog = ({ isOpen, onClose, onSave, initialComment = '' }: CommentDialogProps) => {
  const [comment, setComment] = useState(initialComment);

  const handleSave = () => {
    onSave(comment);
    onClose();
  };

  const handleCancel = () => {
    setComment(initialComment);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent onClose={handleCancel}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {t('comment.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-2">
          <label htmlFor="comment" className="block text-sm font-medium text-foreground mb-2">
            {t('comment.label')}
          </label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('comment.placeholder')}
            className="h-32 resize-none"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button onClick={handleCancel} variant="outline">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('comment.save_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CommentDialog;
