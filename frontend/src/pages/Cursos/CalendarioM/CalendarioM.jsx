import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CalendarioM.css';

const CalendarioM = ({ idCurso }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tareaData, setTareaData] = useState({
    descripcion: '',
    diaInicio: '',
    mesInicio: '',
    añoInicio: '',
    horaInicio: '',
    diaFinal: '',
    mesFinal: '',
    añoFinal: '',
    horaFinal: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tareas, setTareas] = useState([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tareaToDelete, setTareaToDelete] = useState(null);
  const [ejerciciosMaestro, setEjerciciosMaestro] = useState([]);
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState('');
  const [tareasEntregadas, setTareasEntregadas] = useState([]);

  const fechaActual = new Date();
  const mesActual = fechaActual.toLocaleString('es-ES', { month: 'long' });
  const añoActual = fechaActual.getFullYear();

  // Verificar si el usuario es maestro
  const isMaestro = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        
        const decoded = JSON.parse(jsonPayload);
        
        if (decoded.cursos) {
          return decoded.cursos.some(
            curso => curso.idCurso == idCurso && curso.rol === "maestro"
          );
        }
        return false;
      } catch (e) {
        console.error('Error al decodificar token:', e);
        return false;
      }
    }
    return false;
  };

  const isTareaVencida = (tarea) => {
  const ahora = new Date();
  
  // Crear fecha de entrega de la tarea
  const fechaEntrega = new Date(
    tarea.añoFinal,
    tarea.mesFinal - 1, // Los meses en JavaScript son 0-indexados
    tarea.diaFinal,
    ...(tarea.horaFinal ? tarea.horaFinal.split(':').map(Number) : [23, 59]) // Si no hay hora, usar fin del día
  );

  return ahora > fechaEntrega;
};

  // Cargar tareas entregadas por el alumno
  useEffect(() => {
    if (!isMaestro()) {
      const fetchTareasEntregadas = async () => {
        try {
          const token = localStorage.getItem('token');
          const decoded = JSON.parse(atob(token.split('.')[1]));
          const idUsuario = decoded.userId;

          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/ver-ejercicios-alumno/${idUsuario}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Error al cargar las tareas entregadas');
          }

          const data = await response.json();
          // Asegurarnos de que tenemos un array de IDs de tareas entregadas
          const idsEntregados = Array.isArray(data) 
            ? data.map(item => item.idEjercicioCurso || item) 
            : [];
          setTareasEntregadas(idsEntregados);
        } catch (error) {
          console.error('Error:', error);
        }
      };

      fetchTareasEntregadas();
    }
  }, [idCurso]);

  // Cargar tareas del curso
  useEffect(() => {
    const fetchTareas = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/ver-ejercicios-curso/${idCurso}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Error al cargar las tareas');
        }

        const data = await response.json();
        let tareasActivas = data.filter(tarea => tarea.estatusEjercicioCurso === 'activo');
        
        // Solo filtrar tareas vencidas si NO es maestro
        if (!isMaestro()) {
          tareasActivas = tareasActivas.filter(tarea => !isTareaVencida(tarea));
          
          // También filtrar tareas ya entregadas si es alumno
          if (tareasEntregadas.length > 0) {
            tareasActivas = tareasActivas.filter(tarea => 
              !tareasEntregadas.includes(tarea.idEjercicioCurso)
            );
          }
        }
        
        setTareas(tareasActivas);
      } catch (error) {
        console.error('Error:', error);
        setError('Error al cargar las tareas');
      } finally {
        setLoadingTareas(false);
      }
    };

    fetchTareas();
  }, [idCurso, success, tareasEntregadas]);

  // Cargar ejercicios del maestro
  useEffect(() => {
    const fetchEjerciciosMaestro = async () => {
      try {
        const token = localStorage.getItem('token');
        const decoded = JSON.parse(atob(token.split('.')[1]));
        const idUsuario = decoded.userId;

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/ejerciciosMaestro/${idUsuario}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Error al cargar los ejercicios del maestro');
        }

        const data = await response.json();
        const ejerciciosArray = Object.values(data.ejercicios).map(ejercicio => ({
          idEjercicio: ejercicio.idEjercicio,
          ejercicioNombre: ejercicio.ejercicioNombre
        }));
        setEjerciciosMaestro(ejerciciosArray);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    if (isMaestro()) {
      fetchEjerciciosMaestro();
    }
  }, [idCurso]);

  const handleDayClick = (dia) => {
    if (!isMaestro()) return;
    
    const fechaSeleccionada = new Date(añoActual, fechaActual.getMonth(), dia);
    setSelectedDate(fechaSeleccionada);
    
    setTareaData({
      ...tareaData,
      diaInicio: dia,
      mesInicio: fechaActual.getMonth() + 1,
      añoInicio: añoActual,
      diaFinal: dia,
      mesFinal: fechaActual.getMonth() + 1,
      añoFinal: añoActual,
    });
    
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTareaData({
      ...tareaData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const idUsuario = decoded.userId;

      if (!ejercicioSeleccionado) {
        throw new Error('Debes seleccionar un ejercicio');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/agregar-ejercicio-curso`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idUsuario,
          idCurso,
          idEjercicio: ejercicioSeleccionado,
          ...tareaData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al agregar tarea');
      }

      setSuccess('Tarea agregada exitosamente!');
      setTareaData({
        descripcion: '',
        diaInicio: '',
        mesInicio: '',
        añoInicio: '',
        horaInicio: '',
        diaFinal: '',
        mesFinal: '',
        añoFinal: '',
        horaFinal: ''
      });
      
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (idEjercicioCurso) => {
    setTareaToDelete(idEjercicioCurso);
    setShowDeleteModal(true);
  };

  const deleteTarea = async () => {
    if (!tareaToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const idUsuario = decoded.userId;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/eliminar-ejercicio-curso`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idEjercicioCurso: tareaToDelete,
          idCurso,
          idUsuario
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar la tarea');
      }

      setTareas(tareas.filter(tarea => tarea.idEjercicioCurso !== tareaToDelete));
      setSuccess('Tarea eliminada exitosamente!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      setError(error.message);
    } finally {
      setShowDeleteModal(false);
      setTareaToDelete(null);
    }
  };

  // Generar días del calendario
  const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).getDay();
  const diasEnMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate();
  
  const dias = [];
  for (let i = 0; i < primerDiaMes; i++) {
    dias.push(<div key={`empty-${i}`} className="calendario-dia vacio"></div>);
  }
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const esHoy = dia === fechaActual.getDate() && fechaActual.getMonth() === new Date().getMonth();
    dias.push(
      <div 
        key={`dia-${dia}`} 
        className={`calendario-dia ${esHoy ? 'hoy' : ''} ${isMaestro() ? 'clickable' : ''}`}
        onClick={() => handleDayClick(dia)}
      >
        {dia}
      </div>
    );
  }

  const formatFecha = (dia, mes, año, hora) => {
    const fecha = new Date(año, mes - 1, dia);
    return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${año} ${hora || ''}`;
  };

  return (
    <div className="calendario-container">
      <div className="calendario-simple">
        <div className="calendario-cabecera">
          <h3>{mesActual.charAt(0).toUpperCase() + mesActual.slice(1)} {añoActual}</h3>
          {isMaestro() && (
            <button 
              className="btn-agregar-tarea"
              onClick={() => {
                setSelectedDate(new Date());
                setShowModal(true);
              }}
            >
              + Tarea
            </button>
          )}
        </div>
        <div className="calendario-dias-semana">
          <div>D</div>
          <div>L</div>
          <div>M</div>
          <div>M</div>
          <div>J</div>
          <div>V</div>
          <div>S</div>
        </div>
        <div className="calendario-grid">
          {dias}
        </div>
      </div>

      {/* Sección de Tareas */}
      <div className="tareas-section">
        <h3>Tareas del Curso</h3>
        
        {loadingTareas ? (
          <div className="loading-tareas">Cargando tareas...</div>
        ) : error ? (
          <div className="error-tareas">{error}</div>
        ) : tareas.length === 0 ? (
          <div className="no-tareas">No hay tareas asignadas para este curso</div>
        ) : (
          <div className="tareas-container">
            {tareas.map(tarea => (
              <div 
                key={tarea.idEjercicioCurso} 
                className="tarea-card"
                onClick={() => navigate(`/actividad/${tarea.idEjercicioCurso}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="tarea-header">
                  <span className="tarea-fecha">
                    {formatFecha(tarea.diaInicio, tarea.mesInicio, tarea.añoInicio, tarea.horaInicio)}
                    {tarea.diaFinal && ` - ${formatFecha(tarea.diaFinal, tarea.mesFinal, tarea.añoFinal, tarea.horaFinal)}`}
                  </span>
                  {isMaestro() && (
                    <button 
                      className="btn-eliminar-tarea"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(tarea.idEjercicioCurso);
                      }}
                      title="Eliminar tarea"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="tarea-content">
                  <p>{tarea.descripcion}</p>
                </div>
                <div className="tarea-footer">
                  <span className="tarea-maestro">Publicado por: {tarea.nombreMaestro}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación para eliminar tarea */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content confirm-modal">
            <h3>Confirmar eliminación</h3>
            <p>¿Estás seguro de que quieres eliminar esta tarea?</p>
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-cancelar"
                onClick={() => {
                  setShowDeleteModal(false);
                  setTareaToDelete(null);
                }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-confirmar"
                onClick={deleteTarea}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar tarea */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Agregar nueva tarea</h3>
            {selectedDate && (
              <p>Fecha seleccionada: {selectedDate.toLocaleDateString('es-ES')}</p>
            )}
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Seleccionar ejercicio existente:</label>
                <select
                  value={ejercicioSeleccionado}
                  onChange={(e) => {
                    setEjercicioSeleccionado(e.target.value);
                    if (e.target.value) {
                      const ejercicio = ejerciciosMaestro.find(e => e.idEjercicio.toString() === e.target.value);
                      setTareaData({
                        ...tareaData,
                        descripcion: ejercicio?.ejercicioNombre || ''
                      });
                    }
                  }}
                  className="ejercicio-select"
                >
                  <option value="">-- Selecciona un ejercicio existente --</option>
                  {ejerciciosMaestro.map((ejercicio) => (
                    <option key={ejercicio.idEjercicio} value={ejercicio.idEjercicio}>
                      {ejercicio.ejercicioNombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Descripción:</label>
                <textarea
                  name="descripcion"
                  value={tareaData.descripcion}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha inicio:</label>
                  <div className="date-inputs">
                    <input
                      type="number"
                      name="diaInicio"
                      placeholder="Día"
                      min="1"
                      max="31"
                      value={tareaData.diaInicio}
                      onChange={handleInputChange}
                      required
                    />
                    <input
                      type="number"
                      name="mesInicio"
                      placeholder="Mes"
                      min="1"
                      max="12"
                      value={tareaData.mesInicio}
                      onChange={handleInputChange}
                      required
                    />
                    <input
                      type="number"
                      name="añoInicio"
                      placeholder="Año"
                      min="2023"
                      value={tareaData.añoInicio}
                      onChange={handleInputChange}
                      required
                    />
                    <input
                      type="time"
                      name="horaInicio"
                      value={tareaData.horaInicio}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Fecha final:</label>
                  <div className="date-inputs">
                    <input
                      type="number"
                      name="diaFinal"
                      placeholder="Día"
                      min="1"
                      max="31"
                      value={tareaData.diaFinal}
                      onChange={handleInputChange}
                      required
                    />
                    <input
                      type="number"
                      name="mesFinal"
                      placeholder="Mes"
                      min="1"
                      max="12"
                      value={tareaData.mesFinal}
                      onChange={handleInputChange}
                      required
                    />
                    <input
                      type="number"
                      name="añoFinal"
                      placeholder="Año"
                      min="2023"
                      value={tareaData.añoFinal}
                      onChange={handleInputChange}
                      required
                    />
                    <input
                      type="time"
                      name="horaFinal"
                      value={tareaData.horaFinal}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Guardar Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioM;