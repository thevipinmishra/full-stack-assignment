import { Button } from '@base-ui/react/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Loader, Send } from 'reicon-react'
import { FeedbackToast } from '../../components/feedback-toast'
import { useFeedbackToast } from '../../components/use-feedback-toast'
import { sendSampleWebhook } from './api'
import { getErrorMessage, getLeadName } from './display'
import { secondaryButtonClass } from './ui'

export function WebhookDemo() {
  const queryClient = useQueryClient()
  const { toast, showToast, dismissToast } = useFeedbackToast()
  const mutation = useMutation({
    mutationFn: sendSampleWebhook,
    onSuccess: (result) => {
      showToast({
        kind: 'success',
        title: 'Sample lead created',
        description: `${getLeadName(result.lead.fullName)} is ready to review.`,
        action: (
          <Link
            to="/leads/$leadId"
            params={{ leadId: result.lead.id }}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md text-xs font-bold text-[#176c5b] underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
          >
            View lead <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ),
      })
      void queryClient.invalidateQueries({ queryKey: ['leads'] })
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (error) => {
      showToast({
        kind: 'error',
        title: 'Unable to send sample webhook',
        description: getErrorMessage(error),
      })
    },
  })

  return (
    <>
      <Button
        type="button"
        className={`${secondaryButtonClass} gap-2 whitespace-nowrap shadow-[0_2px_5px_rgba(22,55,42,0.035)]`}
        disabled={mutation.isPending}
        onClick={() => {
          dismissToast()
          mutation.mutate()
        }}
      >
        {mutation.isPending ? (
          <Loader
            size={16}
            className="motion-safe:animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Send size={16} aria-hidden="true" />
        )}
        {mutation.isPending ? 'Sending…' : 'Send sample webhook'}
      </Button>
      <FeedbackToast toast={toast} onDismiss={dismissToast} />
    </>
  )
}
