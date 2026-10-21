import { useState } from 'react'
import { useApprove, useReject } from '../../api/review'
import { useToast } from '../../ui/Toast'
import { PreviewModal } from './PreviewModal'
import { RejectModal } from './RejectModal'

/** Preview / approve / reject with their dialogs, shared by the review page and the dashboard queue. */
export function useReviewActions() {
  const toast = useToast()
  const approveMutation = useApprove()
  const rejectMutation = useReject()
  const [previewCode, setPreviewCode] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{ code: string; title: string } | null>(null)

  const approve = (code: string, title: string) => {
    setPreviewCode(null)
    approveMutation.mutate(code, {
      onSuccess: () => toast(`“${title}” approved and ready to publish.`),
      onError: e => toast(e.message, 'error'),
    })
  }

  const reject = (code: string, title: string) => {
    setPreviewCode(null)
    setRejectTarget({ code, title })
  }

  const dialogs = (
    <>
      {previewCode && (
        <PreviewModal
          code={previewCode}
          onClose={() => setPreviewCode(null)}
          onApprove={approve}
          onReject={reject}
          busy={approveMutation.isPending}
        />
      )}
      {rejectTarget && (
        <RejectModal
          busy={rejectMutation.isPending}
          onClose={() => setRejectTarget(null)}
          onSubmit={(reason, note) =>
            rejectMutation.mutate(
              { code: rejectTarget.code, reason, note: note || undefined },
              {
                onSuccess: () => {
                  setRejectTarget(null)
                  toast(`“${rejectTarget.title}” rejected with feedback.`)
                },
                onError: e => toast(e.message, 'error'),
              },
            )
          }
        />
      )}
    </>
  )

  return {
    preview: setPreviewCode,
    approve,
    reject,
    pendingCode: approveMutation.isPending ? approveMutation.variables : null,
    dialogs,
  }
}
