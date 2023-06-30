import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className='canvas-container'>
        <canvas></canvas>
      </div>
    </>
  )
}

export default App
