import { Link } from 'react-router-dom'
import './Info.css'

function Info() {
  return (
    <div className="info">
      <div className="info__content">
        <Link to="/" className="info__back">← Back</Link>
        <h1 className="info__title">INFO</h1>
        <div className="info__body">
          <text className="info__text">I love music, data visualization, and space.</text>
          <text className="info__text"><span class="word-glow">Caneris</span> is intended to be at the intersection of those interests. Maybe I will be the only person that ever finds this interesting.</text>
          <text className="info__text">In the future, I plan on making this more like an interactive experience with your own music taste, like a game of sorts.</text>
        </div>
      </div>
    </div>
  )
}

export default Info
