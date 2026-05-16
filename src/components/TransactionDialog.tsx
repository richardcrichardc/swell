type Transaction = {
  id: number
  date: string
  description: string
}

type Props = {
  transaction: Transaction
  onSave: () => void
  onClose: () => void
}

export default function TransactionDialog({ transaction, onSave, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900">Edit Transaction</h2>
        <p className="mt-1 text-sm text-gray-500">{transaction.date} — {transaction.description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="cursor-pointer text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
