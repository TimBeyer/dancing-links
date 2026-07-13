import './styles.css'
import { CoverStoryGame } from './game.js'

const canvas = document.getElementById('game')
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing game canvas')

new CoverStoryGame(canvas)
