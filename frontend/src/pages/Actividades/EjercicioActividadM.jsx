import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// Importa las piezas
import kingWhite from './assets/wK.png';
import queenWhite from './assets/wQ.png';
import rookWhite from './assets/wR.png';
import bishopWhite from './assets/wB.png';
import knightWhite from './assets/wN.png';
import pawnWhite from './assets/wP.png';
import kingBlack from './assets/bK.png';
import queenBlack from './assets/bQ.png';
import rookBlack from './assets/bR.png';
import bishopBlack from './assets/bB.png';
import knightBlack from './assets/bN.png';
import pawnBlack from './assets/bP.png';
import Footer from '../../components/Footer/Footer';
import Navbar from '../../components/Navbar/Navbar';

const EjercicioActividadM = () => {
    const { idEjercicio } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exercise, setExercise] = useState(null);
    const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
    const [expectedMoves, setExpectedMoves] = useState([]);
    const [isAutoMoving, setIsAutoMoving] = useState(false);
    
    // Versión personalizada de Chess que acepta FEN no estándar
    const createCustomChess = () => {
        const chess = new Chess();
        
        // Método turn seguro
        chess.safeTurn = () => chess.turn();
        
        // Método move modificado para ejercicios
        const originalMove = chess.move.bind(chess);
        chess.move = (move) => {
            try {
                return originalMove(move);
            } catch (e) {
                // Movimiento forzado para ejercicios
                const piece = chess.get(move.from);
                if (!piece) return null;
                
                chess.remove(move.from);
                chess.put({ type: piece.type, color: piece.color }, move.to);
                chess.turn = chess.turn === 'w' ? 'b' : 'w';
                return { ...move, color: piece.color };
            }
        };
        
        return chess;
    };

    const [game, setGame] = useState(createCustomChess());
    const [message, setMessage] = useState('Cargando ejercicio...');
    const [moveList, setMoveList] = useState([]);
    const [boardSize, setBoardSize] = useState(Math.min(window.innerWidth - 40, 500));
    const [boardTheme, setBoardTheme] = useState('green');
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [completed, setCompleted] = useState(false);

    const decodeJWT = (token) => {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) throw new Error('Token inválido');
            
            const payload = parts[1];
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const decodedPayload = atob(base64);
            
            return JSON.parse(decodedPayload);
        } catch (e) {
            console.error('Error decodificando JWT:', e);
            return null;
        }
    };

    const copyGame = (gameInstance) => {
        const newGame = createCustomChess();
        try {
            newGame.load(gameInstance.fen(), { skipValidation: true });
            // Copiamos el turno manualmente si es necesario
            if (gameInstance.turn && !newGame.turn) {
                newGame.turn = gameInstance.turn;
            }
            return newGame;
        } catch (e) {
            console.error('Error al copiar el juego:', e);
            return createCustomChess();
        }
    };


    const initializeGame = (fen) => {
        try {
            const newGame = new Chess();
            newGame.load(fen, { skipValidation: true });
            return newGame;
        } catch (e) {
            console.error('Error inicializando juego con FEN:', fen, e);
            // Creamos un juego vacío como fallback
            const fallbackGame = new Chess();
            try {
                // Intentamos cargar solo la parte de posición del FEN
                const fenParts = fen.split(' ');
                fallbackGame.load(fenParts[0] + ' w - - 0 1', { skipValidation: true });
                return fallbackGame;
            } catch (e2) {
                console.error('Error incluso con fallback:', e2);
                return fallbackGame;
            }
        }
    };

    const updateMoveList = (gameInstance) => {
        const history = gameInstance.history();
        const formattedMoves = [];
        for (let i = 0; i < history.length; i += 2) {
            formattedMoves.push(`${Math.floor(i / 2) + 1}. ${history[i]} ${history[i + 1] || ''}`);
        }
        setMoveList(formattedMoves);
    };

    // Función para ejecutar un movimiento automáticamente
    const executeAutoMove = useCallback((moveIndex) => {
        if (moveIndex >= expectedMoves.length || !exercise) return;
        
        setIsAutoMoving(true);
        const autoMove = expectedMoves[moveIndex];
        
        setTimeout(() => {
            setGame(prevGame => {
                try {
                    const gameCopy = copyGame(prevGame);
                    const moveResult = gameCopy.move({
                        from: autoMove.fromMove,
                        to: autoMove.toMove,
                        promotion: 'q'
                    });

                    if (moveResult) {
                        updateMoveList(gameCopy);
                        setCurrentMoveIndex(moveIndex + 1);
                        
                        if (moveIndex >= expectedMoves.length - 1) {
                            setMessage('¡Ejercicio completado! ');
                            setCompleted(true);
                        } else {
                            setMessage(`Movimiento automático completado. Tu turno: ${moveIndex + 2}/${expectedMoves.length}`);
                        }
                        
                        return gameCopy;
                    }
                } catch (error) {
                    console.error('Error en movimiento automático:', error);
                } finally {
                    setIsAutoMoving(false);
                }
                return prevGame;
            });
        }, 500);
    }, [expectedMoves, exercise]);

    const onDrop = (sourceSquare, targetSquare) => {
        if (completed || !exercise || loading || isAutoMoving) return false;
        
        const currentExpectedMove = expectedMoves[currentMoveIndex];
        
        if (sourceSquare !== currentExpectedMove.fromMove || 
            targetSquare !== currentExpectedMove.toMove) {
            setMessage('Movimiento incorrecto. Intenta nuevamente.');
            return false;
        }

        try {
            const gameCopy = copyGame(game);
            const moveResult = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q'
            });

            if (!moveResult) {
                setMessage('No se pudo completar el movimiento');
                return false;
            }

            setGame(gameCopy);
            updateMoveList(gameCopy);
            setCurrentMoveIndex(prev => prev + 1);
            
            if (currentMoveIndex >= expectedMoves.length - 1) {
                setMessage('¡Ejercicio completado! ');
                setCompleted(true);
            } else {
                setMessage(`¡Correcto! Siguiente: ${currentMoveIndex + 2}/${expectedMoves.length}`);
            }

            return true;
        } catch (error) {
            console.error('Error en movimiento:', error);
            setMessage('Error al procesar el movimiento');
            return false;
        }
    };

    const onDragStart = (piece, sourceSquare) => {
        if (completed || !exercise || loading || isAutoMoving) return false;
        
        const currentTurn = game.turn || game.safeTurn?.();
        if (!currentTurn) return false;
        
        return piece[0].toLowerCase() === currentTurn[0];
    };

    const customPieces = () => {
        const pieceSize = boardSize / 8;
        return {
            wK: () => <img src={kingWhite} style={{ width: pieceSize, height: pieceSize }} alt="Rey blanco" />,
            wQ: () => <img src={queenWhite} style={{ width: pieceSize, height: pieceSize }} alt="Reina blanca" />,
            wR: () => <img src={rookWhite} style={{ width: pieceSize, height: pieceSize }} alt="Torre blanca" />,
            wB: () => <img src={bishopWhite} style={{ width: pieceSize, height: pieceSize }} alt="Alfil blanco" />,
            wN: () => <img src={knightWhite} style={{ width: pieceSize, height: pieceSize }} alt="Caballo blanco" />,
            wP: () => <img src={pawnWhite} style={{ width: pieceSize, height: pieceSize }} alt="Peón blanco" />,
            bK: () => <img src={kingBlack} style={{ width: pieceSize, height: pieceSize }} alt="Rey negro" />,
            bQ: () => <img src={queenBlack} style={{ width: pieceSize, height: pieceSize }} alt="Reina negra" />,
            bR: () => <img src={rookBlack} style={{ width: pieceSize, height: pieceSize }} alt="Torre negra" />,
            bB: () => <img src={bishopBlack} style={{ width: pieceSize, height: pieceSize }} alt="Alfil negro" />,
            bN: () => <img src={knightBlack} style={{ width: pieceSize, height: pieceSize }} alt="Caballo negro" />,
            bP: () => <img src={pawnBlack} style={{ width: pieceSize, height: pieceSize }} alt="Peón negro" />
        };
    };

    useEffect(() => {
        if (!isAutoMoving && currentMoveIndex < expectedMoves.length && 
            (currentMoveIndex + 1) % 2 === 0 && !loading && !completed) {
            executeAutoMove(currentMoveIndex);
        }
    }, [currentMoveIndex, isAutoMoving, executeAutoMove, expectedMoves, loading, completed]);

    useEffect(() => {
        const fetchExercise = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No se encontró el token de acceso');
                
                const decoded = decodeJWT(token);
                if (!decoded?.userId) throw new Error('Token inválido');
                
                const response = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/admin/ejercicioMaestro/${decoded.userId}/${idEjercicio}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                
                if (!response.data.success) {
                    throw new Error(response.data.message || 'Error en la respuesta del servidor');
                }

                if (!response.data.ejercicio?.movimientos?.length) {
                    throw new Error('El ejercicio no contiene movimientos');
                }

                // Guardar los movimientos esperados
                setExpectedMoves(response.data.ejercicio.movimientos);
                
                // Inicializar con el primer FEN (solo al inicio)
                const initialFen = response.data.ejercicio.movimientos[0].fen;
                const newGame = initializeGame(initialFen);
                
                setExercise(response.data.ejercicio);
                setGame(newGame);
                updateMoveList(newGame);
                setMessage(`Realiza el movimiento 1/${response.data.ejercicio.movimientos.length}`);
                
            } catch (err) {
                console.error('Error al cargar el ejercicio:', err);
                setError(err.message);
                setMessage(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        
        fetchExercise();
        // ... (resto del efecto permanece igual)
    }, [idEjercicio]);

    if (loading) {
        return (
            <div className="chess-container">
                <div className="chess-loading">
                    <p>{message}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chess-container">
                <div className="chess-error">
                    <p>Error: {error}</p>
                    <p>Por favor, recarga la página o contacta al administrador.</p>
                </div>
            </div>
        );
    }

    if (!exercise) {
        return (
            <div className="chess-container">
                <div className="chess-error">
                    <p>No se pudo cargar el ejercicio solicitado.</p>
                </div>
            </div>
        );
    }

    return (
        <>
        <section>
            <Navbar />
        </section>
        <div className="chess-container">
            <div className="chess-main-content">
                <div className="chess-board-container">
                    <div className="chess-controls">
                        <div className="theme-selector-container">
                            <button 
                                className="theme-dropdown-btn" 
                                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                            >
                                Temas del tablero ▼
                            </button>
                            
                            {showThemeDropdown && (
                                <div className="theme-dropdown">
                                    <button 
                                        onClick={() => {
                                            setBoardTheme('green');
                                            setShowThemeDropdown(false);
                                        }}
                                        className={boardTheme === 'green' ? 'active' : ''}
                                    >
                                        <span className="theme-preview green"></span>
                                        Verde Clásico
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setBoardTheme('brown');
                                            setShowThemeDropdown(false);
                                        }}
                                        className={boardTheme === 'brown' ? 'active' : ''}
                                    >
                                        <span className="theme-preview brown"></span>
                                        Madera Clásica
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setBoardTheme('blue');
                                            setShowThemeDropdown(false);
                                        }}
                                        className={boardTheme === 'blue' ? 'active' : ''}
                                    >
                                        <span className="theme-preview blue"></span>
                                        Azul Marino
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="chess-board-wrapper" style={{ width: boardSize, height: boardSize }}>
                        <Chessboard 
                            position={game.fen()} 
                            onPieceDrop={onDrop}
                            onPieceDragBegin={onDragStart}
                            boardWidth={boardSize}
                            customPieces={customPieces()}
                            customBoardStyle={{
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
                            }}
                            customDarkSquareStyle={{ 
                                backgroundColor: boardTheme === 'green' ? '#1a1a1a' : 
                                                boardTheme === 'brown' ? '#B58863' : '#5D8AA8',
                                borderRadius: '2px'
                            }}
                            customLightSquareStyle={{ 
                                backgroundColor: boardTheme === 'green' ? '#f0f0f0' : 
                                            boardTheme === 'brown' ? '#F0D9B5' : '#B9D9EB',
                                borderRadius: '2px'
                            }}
                        />
                    </div>
                    <div className="chess-message">
                        {message}
                        {completed && <span className="completed-message"> ✓</span>}
                    </div>
                </div>
            </div>
        </div>
        <section>
            <Footer />
        </section>
        </>
    );
};

export default EjercicioActividadM;