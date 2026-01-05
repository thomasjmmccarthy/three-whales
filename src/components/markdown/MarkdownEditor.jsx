import Placeholder from "@tiptap/extension-placeholder"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Markdown } from "tiptap-markdown"

export default function MarkDownEditor({ value="", onChange, placeholder="", className, internalClassName }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown();
      onChange?.(md);
    },
  });

  return (
    <div className={className}>
      <EditorContent editor={editor} className='markdown-input prose max-w-none' />
    </div>
  )
}