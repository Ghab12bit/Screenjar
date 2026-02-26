import Recorder from '@/components/Recorder'

export const metadata = {
  title: 'New Recording — LoomMVP',
}

export default function RecordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New Recording</h1>
        <p className="text-gray-400 mt-1">Choose your recording mode and press Record to start.</p>
      </div>
      <Recorder />
    </div>
  )
}
