import { useState, useRef, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import "./ProfessorChallenges.css";

import Navbar from '../Navbar/Navbar'

// Importar las imágenes de las piezas
import wP from './assets/pieces/wP.png';
import wN from './assets/pieces/wN.png';
import wB from './assets/pieces/wB.png';
import wR from './assets/pieces/wR.png';
import wQ from './assets/pieces/wQ.png';
import wK from './assets/pieces/wK.png';
import bP from './assets/pieces/bP.png';
import bN from './assets/pieces/bN.png';
import bB from './assets/pieces/bB.png';
import bR from './assets/pieces/bR.png';
import bQ from './assets/pieces/bQ.png';
import bK from './assets/pieces/bK.png';

const ProfessorChallenges = () => {
  const [challengeName, setChallengeName] = useState("");
  const [initialPosition, setInitialPosition] = useState({});
  const [moves, setMoves] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [isPlacingMode, setIsPlacingMode] = useState(true); // Comienza en modo colocación
  const [boardTheme, setBoardTheme] = useState("green");
  const [currentPosition, setCurrentPosition] = useState({}); // Posición actual durante grabación
  const [isRecording, setIsRecording] = useState(false); // Estado de grabación de movimientos
  const moveHistory = useRef([]); // Referencia para mantener el historial de movimientos
  const [boardSize, setBoardSize] = useState(Math.min(window.innerWidth - 40, 600));

  // Función para generar FEN desde la posición inicial
  const generateFENFromPosition = (position) => {
    const board = Array(8).fill().map(() => Array(8).fill(null));
    
    // Colocar las piezas en el tablero
    Object.entries(position).forEach(([square, piece]) => {
      const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
      const row = 8 - parseInt(square[1], 10);
      board[row][col] = piece;
    });

    // Convertir el tablero a notación FEN
    let fen = '';
    for (let row = 0; row < 8; row++) {
      let emptyCount = 0;
      for (let col = 0; col < 8; col++) {
        if (board[row][col] === null) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          const piece = board[row][col];
          const fenPiece = piece[0] === 'w' 
            ? piece[1].toUpperCase() 
            : piece[1].toLowerCase();
          fen += fenPiece;
        }
      }
      if (emptyCount > 0) {
        fen += emptyCount;
      }
      if (row < 7) {
        fen += '/';
      }
    }

    return `${fen} w - - 0 1`;
  };

  useEffect(() => {
    const handleResize = () => {
      setBoardSize(Math.min(window.innerWidth - 40, 600));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const undoLastMove = () => {
    if (moves.length === 0) return;
    
    // Copiar el historial actual
    const newMoves = [...moves];
    const lastMove = newMoves.pop();
    
    // Revertir la posición en el tablero
    const newPosition = {...currentPosition};
    
    // Mover la pieza de vuelta a su posición original
    const piece = newPosition[lastMove.to];
    delete newPosition[lastMove.to];
    newPosition[lastMove.from] = piece;
    
    // Actualizar estados
    setCurrentPosition(newPosition);
    setMoves(newMoves);
    moveHistory.current = newMoves;
  };

  const handleSquareClick = (square) => {
    if (!isPlacingMode || !selectedPiece) return;

    const newPosition = { ...initialPosition };
    
    if (selectedPiece === "empty") {
      if (newPosition[square]) {
        delete newPosition[square];
      }
    } else {
      newPosition[square] = selectedPiece;
    }

    setInitialPosition(newPosition);
  };

  const handlePieceClick = (piece) => {
    if (isPlacingMode && selectedPiece === piece) {
      setSelectedPiece(null);
      setIsPlacingMode(false);
      return;
    }
    
    setSelectedPiece(piece);
    setIsPlacingMode(true);
  };

  // Función para bloquear el tablero y comenzar a grabar movimientos
  const lockBoardAndStartRecording = () => {
    if (Object.keys(initialPosition).length === 0) {
      alert("Por favor coloca al menos una pieza en el tablero");
      return;
    }
    
    setIsPlacingMode(false);
    setIsRecording(true);
    setCurrentPosition({...initialPosition});
    setMoves([]);
    moveHistory.current = [];
  };

  // Función para reiniciar la creación del ejercicio
  const resetExerciseCreation = () => {
    setInitialPosition({});
    setCurrentPosition({});
    setMoves([]);
    moveHistory.current = [];
    setIsPlacingMode(true);
    setIsRecording(false);
    setSelectedPiece(null);
  };

  // Función para manejar el movimiento de piezas durante la grabación
  const onDrop = (sourceSquare, targetSquare) => {
    if (!isRecording) return false;
    
    // Verificar si hay una pieza en la casilla de origen
    if (!currentPosition[sourceSquare]) return false;
    
    // Crear nueva posición
    const newPosition = {...currentPosition};
    const movingPiece = newPosition[sourceSquare];
    
    // Mover la pieza
    delete newPosition[sourceSquare];
    newPosition[targetSquare] = movingPiece;
    
    // Actualizar estado
    setCurrentPosition(newPosition);
    
    // Agregar movimiento a la lista
    const newMove = { from: sourceSquare, to: targetSquare };
    const updatedMoves = [...moves, newMove];
    setMoves(updatedMoves);
    moveHistory.current = updatedMoves;
    
    return true;
  };

  const createChallenge = async () => {
    // Validar campos obligatorios
    if (!challengeName.trim()) {
      alert("Por favor ingresa un nombre para el desafío");
      return;
    }

    // Validar movimientos
    if (moves.length === 0) {
      alert("Por favor graba al menos un movimiento");
      return;
    }

    // Obtener el ID del usuario del token
    const token = localStorage.getItem('token');
    if (!token) {
      alert("No estás autenticado. Por favor inicia sesión.");
      return;
    }

    const decodedToken = parseJwt(token);
    const idUsuario = decodedToken.userId;

    // Generar FEN de la posición inicial
    const initialFEN = Object.keys(initialPosition).length > 0
      ? generateFENFromPosition(initialPosition)
      : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    // Preparar los movimientos en el formato que espera el backend
    const movimientos = moves.map((move, index) => ({
      ordenMovimiento: index + 1,
      fromMove: move.from,
      toMove: move.to,
      fen: initialFEN,
    }));

    const challengeData = {
      movimientos,
      idUsuario,
      nombreEjercicio: challengeName,
      idEjercicioCurso: null
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/crearEjercicio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(challengeData),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Desafío "${data.nombreEjercicio.nombreEjercicio}" creado exitosamente!`);
        resetExerciseCreation();
        setChallengeName("");
      } else {
        alert(data.message || "Error al crear desafío");
      }
    } catch (error) {
      console.error("Error en la creación del desafío:", error);
      alert("Hubo un error al crear el desafío. Por favor intenta nuevamente.");
    }
  };

  const customPieces = () => {
    const pieceSize = boardSize / 8;
    return {
      wK: () => <img src={wK} style={{ width: pieceSize, height: pieceSize }} alt="White King" />,
      wQ: () => <img src={wQ} style={{ width: pieceSize, height: pieceSize }} alt="White Queen" />,
      wR: () => <img src={wR} style={{ width: pieceSize, height: pieceSize }} alt="White Rook" />,
      wB: () => <img src={wB} style={{ width: pieceSize, height: pieceSize }} alt="White Bishop" />,
      wN: () => <img src={wN} style={{ width: pieceSize, height: pieceSize }} alt="White Knight" />,
      wP: () => <img src={wP} style={{ width: pieceSize, height: pieceSize }} alt="White Pawn" />,
      bK: () => <img src={bK} style={{ width: pieceSize, height: pieceSize }} alt="Black King" />,
      bQ: () => <img src={bQ} style={{ width: pieceSize, height: pieceSize }} alt="Black Queen" />,
      bR: () => <img src={bR} style={{ width: pieceSize, height: pieceSize }} alt="Black Rook" />,
      bB: () => <img src={bB} style={{ width: pieceSize, height: pieceSize }} alt="Black Bishop" />,
      bN: () => <img src={bN} style={{ width: pieceSize, height: pieceSize }} alt="Black Knight" />,
      bP: () => <img src={bP} style={{ width: pieceSize, height: pieceSize }} alt="Black Pawn" />
    };
  };

  const renderPieceButtons = () => {
    return [
      "wK", "wQ", "wR", "wB", "wN", "wP",
      "bK", "bQ", "bR", "bB", "bN", "bP",
    ].map((p) => (
      <button
        key={p}
        onClick={() => handlePieceClick(p)}
        className={`professor-challenges-piece-btn ${selectedPiece === p ? 'professor-challenges-active' : ''}`}
        disabled={!isPlacingMode}
      >
        <img
          src={p === "wK" ? wK : 
               p === "wQ" ? wQ : 
               p === "wR" ? wR : 
               p === "wB" ? wB : 
               p === "wN" ? wN : 
               p === "wP" ? wP : 
               p === "bK" ? bK : 
               p === "bQ" ? bQ : 
               p === "bR" ? bR : 
               p === "bB" ? bB : 
               p === "bN" ? bN : bP}
          alt={p}
          className="professor-challenges-piece-img"
        />
      </button>
    ));
  };

  return (
    <>
    <section>
      <Navbar />
    </section>
    <div className="professor-challenges-container">
      <h2 className="professor-challenges-title">Crear tus desafíos</h2>
      
      <div className="professor-challenges-layout">
        {/* Columna izquierda - Nombre y piezas */}
        <div className="professor-challenges-left-column">
          <div className="professor-challenges-pieces-container">
            <h3 className="professor-challenges-pieces-title">Configuración del Desafío</h3>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Nombre del Desafío:</label>
              <input
                type="text"
                value={challengeName}
                onChange={(e) => setChallengeName(e.target.value)}
                className="professor-challenges-room-code"
                placeholder="Ej: Apertura de peón rey"
              />
            </div>
          </div>

          <div className="professor-challenges-pieces-container">
            <h3 className="professor-challenges-pieces-title">
              {isPlacingMode
                ? selectedPiece === "empty"
                  ? "Modo: Eliminar piezas"
                  : `Modo: Colocar ${selectedPiece}`
                : isRecording
                  ? "Modo: Grabación de movimientos"
                  : "Selecciona una pieza"}
            </h3>
            
            <div className="professor-challenges-pieces-grid">
              {renderPieceButtons()}
            </div>

            {isPlacingMode && (
              <div className="professor-challenges-actions">
                <button
                  onClick={() => handlePieceClick("empty")}
                  className={`professor-challenges-delete-btn ${selectedPiece === "empty" ? 'professor-challenges-active' : ''}`}
                >
                  Eliminar Piezas
                </button>

                {selectedPiece && (
                  <button
                    onClick={() => {
                      setSelectedPiece(null);
                      //setIsPlacingMode(false);
                    }}
                    className="professor-challenges-cancel-btn"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Columna central - Tablero */}
        <div className="professor-challenges-center-column">
          <div className={`professor-challenges-board-container ${boardTheme}`}>
            <Chessboard
              position={isRecording ? currentPosition : initialPosition}
              onSquareClick={isPlacingMode ? handleSquareClick : undefined}
              onPieceDrop={isRecording ? onDrop : undefined}
              boardWidth={boardSize}
              customDarkSquareStyle={{ 
                backgroundColor: boardTheme === 'green' ? '#779556' : 
                                boardTheme === 'brown' ? '#b58863' : 
                                boardTheme === 'blue' ? '#4682b4' : '#1a1a1a'
              }}
              customLightSquareStyle={{ 
                backgroundColor: boardTheme === 'green' ? '#ebecd0' : 
                                boardTheme === 'brown' ? '#f0d9b5' : 
                                boardTheme === 'blue' ? '#87ceeb' : '#f0f0f0'
              }}
              customPieces={customPieces()}
            />
          </div>

          <div className="professor-challenges-actions" style={{ marginTop: '20px', width: '100%' }}>
            {isPlacingMode ? (
              <button
                onClick={lockBoardAndStartRecording}
                className="professor-challenges-start-btn"
              >
                Bloquear Tablero y Grabar Movimientos
              </button>
            ) : (
              <button
                onClick={resetExerciseCreation}
                className="professor-challenges-delete-btn"
              >
                Reiniciar Creación de Ejercicio
              </button>
            )}
          </div>
        </div>

        {/* Columna derecha - Movimientos y crear */}
        <div className="professor-challenges-right-column">
          <div className="professor-challenges-pieces-container">
            <h3 className="professor-challenges-pieces-title">Movimientos del Desafío</h3>
            
            {moves.length === 0 ? (
              <p>{isRecording 
                ? "Graba movimientos arrastrando las piezas en el tablero" 
                : "Bloquea el tablero primero para grabar movimientos"}</p>
            ) : (
              <>
                <div className="professor-challenges-moves-list">
                  {moves.map((move, index) => (
                    <div key={index} className="professor-challenges-move-item">
                      <span style={{ flex: '0 0 30px', fontWeight: 'bold' }}>{index + 1}.</span>
                      <span style={{ flex: 1 }}>{move.from} → {move.to}</span>
                      <button
                        onClick={() => {
                          const newMoves = [...moves];
                          newMoves.splice(index, 1);
                          setMoves(newMoves);
                          moveHistory.current = newMoves;
                        }}
                        className="professor-challenges-delete-btn"
                        style={{ padding: '5px 10px' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={undoLastMove}
                  className="professor-challenges-start-btn"
                  style={{ backgroundColor: '#f39c12' }}
                >
                  ↩ Deshacer Último Movimiento
                </button>
              </>
            )}
          </div>

          <button
            onClick={createChallenge}
            className="professor-challenges-start-btn"
            disabled={!isRecording || moves.length === 0}
          >
            Crear Desafío
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default ProfessorChallenges;