import React, { useState, useEffect } from 'react';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  BookOutlined, 
  CalendarOutlined, 
  TeamOutlined, 
  FileOutlined,
  HomeOutlined,
  SettingOutlined,
  UserOutlined,
  EditOutlined 
} from '@ant-design/icons';
import { 
  Table,
  Layout, 
  Menu, 
  Card, 
  Row, 
  Col, 
  Button, 
  theme, 
  Spin, 
  message, 
  Drawer, 
  List, 
  Avatar,
  Tag,
  Pagination 
} from 'antd';
import { useNavigate } from 'react-router-dom';
import './CursosMaes.css';
import logo from './assets/LogoChessmy02.png';

const { Header, Sider, Content } = Layout;

const encodeBase64 = (str) => {
  return btoa(encodeURIComponent(str));
};

const generateRandomColor = () => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F06292', '#A569BD', '#5DADE2'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const CursosAlu = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [courses, setCourses] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alumnosLoading, setAlumnosLoading] = useState(false);
  const [showAlumnos, setShowAlumnos] = useState(false);
  const [showTareasEntregadas, setShowTareasEntregadas] = useState(false);
  const [tareasPorCurso, setTareasPorCurso] = useState({});
  const [currentTablePage, setCurrentTablePage] = useState(1);
  const [tablesPerPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const handleMenuClick = ({ key }) => {
    setShowAlumnos(false);
    setShowTareasEntregadas(false);

    if (key === '4') {
      setShowAlumnos(true);
    } else if (key === '5') {
      setShowTareasEntregadas(true);
    } else if (key === '1') {
      navigate('/inicio');
    } else if (key === '2') {
      navigate('/professor-challenges');
    } else if (key === '3') {
      navigate('/ejercicios_maestro');
    } else if (key == '6') {
      window.location.reload();
    }
  };

  const paginatedCourseKeys = Object.keys(tareasPorCurso).slice(
    (currentTablePage - 1) * tablesPerPage,
    currentTablePage * tablesPerPage
  );

  const handleTablePageChange = (page) => {
    setCurrentTablePage(page);
  }

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992); // lg breakpoint de Ant Design
    };
    
    handleResize(); // Ejecutar al montar
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCourses = async (userId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const endpoint = `${import.meta.env.VITE_API_URL}/api/admin/cursos/getCursosMaestro/${userId}`;
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener cursos');
      }

      const data = await response.json();
      const formattedCourses = data.map(item => {
        const curso = item.Curso || item.curso || item;
        return {
          id: curso.idCurso || curso.id,
          title: curso.nombreCurso || curso.nombre || 'Curso sin nombre',
          code: curso.codigo || `CURSO-${curso.idCurso || curso.id}`,
          teacher: `Prof. ${curso.maestro || 'Usuario'}`,
          color: generateRandomColor(),
          description: curso.descripcion || ''
        };
      });
      setCourses(formattedCourses);
    } catch (error) {
      console.error('Error:', error);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlumnos = async (userId) => {
    try {
      setAlumnosLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/cursos/getAlumnosPorMaestro/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener alumnos');
      }

      const data = await response.json();
      setAlumnos(data);
    } catch (error) {
      console.error('Error:', error);
      message.error(error.message);
    } finally {
      setAlumnosLoading(false);
    }
  };

  const fetchTareasEntregadas = async (userId) => {
    try {
      setAlumnosLoading(true);
      const token = localStorage.getItem('token');
      
      // 1. Obtener los cursos del maestro
      const cursosResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/cursos/getCursosMaestro/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!cursosResponse.ok) {
        throw new Error('Error al obtener cursos');
      }
      
      const cursosData = await cursosResponse.json();
      
      // Crear un mapa de cursos para acceso rápido por idCurso
      const cursosMap = {};
      cursosData.forEach(curso => {
        const cursoObj = curso.Curso || curso.curso || curso;
        cursosMap[cursoObj.idCurso || cursoObj.id] = {
          id: cursoObj.idCurso || cursoObj.id,
          nombreCurso: cursoObj.nombreCurso || cursoObj.nombre || 'Curso sin nombre',
          codigo: cursoObj.codigo || `CURSO-${cursoObj.idCurso || cursoObj.id}`,
          color: generateRandomColor()
        };
      });
      
      // 2. Obtener los alumnos del maestro
      const alumnosResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/cursos/getAlumnosPorMaestro/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!alumnosResponse.ok) {
        throw new Error('Error al obtener alumnos');
      }
      
      const alumnosData = await alumnosResponse.json();
      
      // 3. Obtener todas las tareas entregadas para estos alumnos
      const tareasPromises = alumnosData.map(async (alumno) => {
        const cursoInfo = cursosMap[alumno.idCurso];
        if (!cursoInfo) {
          console.warn(`No se encontró información del curso para idCurso: ${alumno.idCurso}`);
          return null;
        }
        
        try {
          const tareasResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/ver-ejercicios-del-usuario-en-el-curso/${alumno.idCurso}/${alumno.idUsuario}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!tareasResponse.ok) return null;
          
          const tareasData = await tareasResponse.json();
          return tareasData.map(tarea => ({
            idEjercicioAlumno: tarea.idEjercicioAlumno,
            idUsuario: alumno.idUsuario,
            idEjercicioCurso: tarea.idEjercicioCurso,
            estatusEjercicio: tarea.estatusEjercicio,
            diaEntrega: tarea.diaEntrega,
            mesEntrega: tarea.mesEntrega,
            añoEntrega: tarea.añoEntrega,
            horaEntrega: tarea.horaEntrega,
            nombreAlumno: alumno.nombreCompleto,
            idCurso: cursoInfo.id,
            nombreCurso: cursoInfo.nombreCurso,
            codigoCurso: cursoInfo.codigo,
            ejercicio: tarea.descripcion

          }));
        } catch (error) {
          console.error(`Error al obtener tareas para alumno ${alumno.idUsuario}`, error);
          return null;
        }
      });
      
      const tareasResults = await Promise.all(tareasPromises);
      const tareasEntregadas = tareasResults.flat().filter(Boolean);
      
      // Agrupar tareas por curso
      const tareasAgrupadas = {};
      tareasEntregadas.forEach(tarea => {
        if (!tareasAgrupadas[tarea.idCurso]) {
          tareasAgrupadas[tarea.idCurso] = {
            curso: {
              nombre: tarea.nombreCurso,
              codigo: tarea.codigoCurso,
              color: cursosMap[tarea.idCurso]?.color || generateRandomColor()
            },
            tareas: []
          };
        }
        tareasAgrupadas[tarea.idCurso].tareas.push(tarea);
      });
      
      return tareasAgrupadas;
    } catch (error) {
      console.error('Error:', error);
      message.error(error.message);
      return {};
    } finally {
      setAlumnosLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const payload = token.split('.')[1];
        const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const tokenData = JSON.parse(decodedPayload);
        const userId = tokenData.userId;

        if (!userId) return;

        await fetchCourses(userId);
        
        if (showAlumnos) {
          await fetchAlumnos(userId);
        } else if (showTareasEntregadas) {
          const tareasAgrupadas = await fetchTareasEntregadas(userId);
          setTareasPorCurso(tareasAgrupadas);
        }
      } catch (error) {
        console.error('Error:', error);
        message.error('Error al cargar datos');
      }
    };

    fetchData();
  }, [showAlumnos, showTareasEntregadas]);

  return (
    <Layout className="layout-container">
        <Sider 
            trigger={null} 
            collapsible 
            collapsed={collapsed}
            width={250}
            breakpoint="lg"
            collapsedWidth={isMobile ? 0 : 80}
            onBreakpoint={(broken) => {
              if (broken !== collapsed) {
                setCollapsed(broken);
              }
            }}
            style={{
              zIndex: 100, // Asegurar que esté por encima del contenido
              position: isMobile ? 'absolute' : 'relative',
              height: '100vh',
            }}
            
        >
        <div className="logo-container">
            {collapsed ? (
            <img 
                src={logo} 
                alt="Logo" 
                className="logo-collapsed" 
            />
            ) : (
            <img 
                src={logo} 
                alt="Logo Completo" 
                className="logo-expanded" 
            />
            )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['1']}
          onClick={handleMenuClick}
          items={[
            {
                key: '1',
                icon: <HomeOutlined />,
                label: 'Inicio',
            },
            {
                key: '6',
                icon: <BookOutlined />,
                label: 'Cursos',
            },
            {
                key: '2',
                icon: <EditOutlined />,
                label: 'Crear Ejercicio',
            },
            {
                key: '3',
                icon: <FileOutlined />,
                label: 'Ver ejercicios',
            },
            {
              key: '4',
              icon: <TeamOutlined />,
              label: 'Estudiantes',
            },
            {
              key: '5',
              icon: <CalendarOutlined />,
              label: 'Tareas Entregadas',
            }
          ]}
        />
      </Sider>

      <Drawer
        title="Mis Alumnos"
        width={400}
        onClose={() => setShowAlumnos(false)}
        open={showAlumnos}
        styles={{
          body: { padding: 15 }
        }}
      >
        {alumnosLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
            <Spin />
          </div>
        ) : alumnos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <p>No tienes alumnos asignados</p>
          </div>
        ) : (
            <List
            itemLayout="horizontal"
            dataSource={alumnos}
            renderItem={(alumno) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={alumno.nombreCompleto}
                  description={
                    <>
                      <p>{alumno.email}</p>
                      <p><strong>Curso:</strong> {alumno.curso}</p>
                    </>
                  }
                />
            </List.Item>
            )}
          />
        )}
      </Drawer>

      <Layout>
        <Header style={{ 
          padding: 0, 
          background: colorBgContainer,
          position: 'sticky',
          top: 0,
          zIndex: 90,
        }}>
          <Row justify="space-between" align="middle">
            <Col>
              {isMobile && (
                <Button
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                  style={{
                    fontSize: '16px',
                    width: 64,
                    height: 64,
                    position: 'fixed',
                    zIndex: 1001,
                    left: collapsed ? 0 : 250,
                  }}
                />
              )}
              {!isMobile && (
                <Button
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                  style={{
                    fontSize: '16px',
                    width: 64,
                    height: 64,
                  }}
                />
              )}
            </Col>
            <Col style={{ paddingRight: '24px' }}>
              <span style={{ fontWeight: 'bold' }}>Bienvenido, Maestro</span>
            </Col>
          </Row>
        </Header>
        <Content className="content-container" style={{ background: colorBgContainer }}>
          {showTareasEntregadas ? (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Tareas Entregadas</h2>
            {alumnosLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                <Spin />
              </div>
            ) : Object.keys(tareasPorCurso).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <p>No hay tareas entregadas para mostrar</p>
              </div>
            ) : (
              <div>
                {/* Controles de paginación en la parte superior */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <Button 
                    disabled={currentTablePage === 1}
                    onClick={() => handleTablePageChange(currentTablePage - 1)}
                  >
                    Anterior
                  </Button>
                  
                  <span>
                    Curso {currentTablePage} de {Math.ceil(Object.keys(tareasPorCurso).length / tablesPerPage)}
                  </span>
                  
                  <Button 
                    disabled={currentTablePage === Math.ceil(Object.keys(tareasPorCurso).length / tablesPerPage)}
                    onClick={() => handleTablePageChange(currentTablePage + 1)}
                  >
                    Siguiente
                  </Button>
                </div>

                {/* Mostrar solo la tabla de la página actual */}
                {paginatedCourseKeys.map(idCurso => {
                  const { curso, tareas } = tareasPorCurso[idCurso];
                  return (
                    <div key={idCurso} style={{ marginBottom: '32px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginBottom: '16px',
                        padding: '8px 16px',
                        backgroundColor: curso.color,
                        borderRadius: '4px'
                      }}>
                        <h3 style={{ 
                          margin: 0, 
                          color: 'white',
                          flex: 1
                        }}>
                          {curso.nombre} ({curso.codigo})
                        </h3>
                        <Tag color="default" style={{ fontSize: '14px' }}>
                          {tareas.length} {tareas.length === 1 ? 'tarea' : 'tareas'}
                        </Tag>
                      </div>
                      <Table
                        dataSource={tareas}
                        columns={[
                          { 
                            title: 'Estudiante', 
                            dataIndex: 'nombreAlumno', 
                            key: 'nombreAlumno',
                            render: (text) => <span>{text || 'Nombre no disponible'}</span>
                          },
                          { 
                            title: 'Descripción', 
                            dataIndex: 'ejercicio', 
                            key: 'ejercicio',
                            render: (_, record) => (
                              <span>
                                {record.ejercicio || 'Sin descripción'}
                              </span>
                            )
                          },
                          { 
                            title: 'Fecha de Entrega', 
                            key: 'fechaEntrega',
                            render: (_, record) => (
                              <span>
                                {record.diaEntrega?.toString().padStart(2, '0')}/
                                {record.mesEntrega?.toString().padStart(2, '0')}/
                                {record.añoEntrega} {record.horaEntrega || ''}
                              </span>
                            )
                          },
                          { 
                            title: 'Estado', 
                            dataIndex: 'estatusEjercicio', 
                            key: 'estatusEjercicio',
                            render: (status) => {
                              let statusText = status || 'Sin estado';
                              let color = 'default';
                              
                              if (status === 'entregado') color = 'green';
                              else if (status === 'pendiente') color = 'orange';
                              else if (status === 'atrasado') color = 'red';
                              
                              return <Tag color={color}>{statusText}</Tag>;
                            }
                          },
                          
                        ]}
                        pagination={{ pageSize: 5 }}
                        scroll={{ x: true }}
                        rowKey="idEjercicioAlumno"
                        style={{ marginBottom: '24px' }}
                        bordered
                      />
                    </div>
                  );
                })}

                {/* Controles de paginación en la parte inferior */}
                
              </div>
            )}
          </div>
        ) : (
            <>
              <h2 style={{ marginBottom: '20px' }}>Mis Cursos</h2>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                  <Spin size="large" />
                </div>
              ) : courses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p>No tienes cursos asignados actualmente</p>
                </div>
              ) : (
                <Row gutter={[16, 16]}>
                  {courses.map(course => (
                    <Col xs={24} sm={12} md={8} lg={6} key={course.id}>
                      <Card
                        hoverable
                        className="course-card"
                        style={{ borderTop: `4px solid ${course.color}` }}
                        cover={<div className="course-card-cover" style={{ backgroundColor: course.color }} />}
                        onClick={() => navigate(`/curso/${encodeBase64(course.id.toString())}`)}
                      >
                        <Card.Meta
                          title={<h3 className="course-title">{course.title}</h3>}
                          description={
                            <>
                              <p className="course-code">{course.code}</p>
                              <p className="course-teacher">{course.teacher}</p>
                              {course.description && (
                                <p style={{ marginTop: '8px', fontSize: '0.9em' }}>
                                  {course.description.length > 100
                                    ? `${course.description.substring(0, 100)}...`
                                    : course.description}
                                </p>
                              )}
                            </>
                          }
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default CursosAlu;