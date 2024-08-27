import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Card, Button, Form, Alert, Spinner, ListGroup } from 'react-bootstrap';
import LinkManager, { MapEntry } from './LinkManager';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<MapEntry[]>([]);

  useEffect(() => {
      setLinks(LinkManager.getLinks());
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
          setFile(event.target.files[0]);
      }
      setUploadUrl(null);
      setError(null);
  };

  const handleUpload = async () => {
      if (!file) {
          setError('Пожалуйста, выберите файл.');
          return;
      }

      setLoading(true);

      const formData = new FormData();
      formData.append('file', file);

      try {
          const response = await axios.post('http://localhost:3000/upload', formData, {
              headers: {
                  'Content-Type': 'multipart/form-data',
              },
          });

          if (response.data.url) {
              setUploadUrl(response.data.url);
              LinkManager.addLink(file.name, response.data.url);
              setLinks(LinkManager.getLinks());
          } else {
              setError('Не удалось загрузить карту.');
          }
      } catch (err) {
          if (axios.isAxiosError(err) && err.response) {
              setError('Ошибка при загрузке карты: ' + err.response.data);
          } else {
              setError('Произошла неизвестная ошибка.');
          }
      } finally {
          setLoading(false);
      }
  };

  return (
      <Container className="d-flex vh-100">
          <div className="m-auto" style={{ width: '100%', maxWidth: '400px' }}>
              <Card className="p-3 shadow-lg">
                  <Card.Body>
                      <Card.Title className="text-center mb-4">Загрузка карты</Card.Title>
                      <Form>
                          <Form.Group controlId="formFile" className="mb-3">
                              <Form.Label>Выберите файл:</Form.Label>
                              <Form.Control type="file" onChange={handleFileChange} />
                          </Form.Group>
                          <Button
                              onClick={handleUpload}
                              variant="primary"
                              className="w-100"
                              disabled={loading}
                          >
                              {loading ? (
                                  <>
                                      <Spinner animation="border" size="sm" /> Загрузка...
                                  </>
                              ) : (
                                  'Загрузить карту'
                              )}
                          </Button>
                      </Form>
                      {uploadUrl && (
                          <Alert variant="success" className="mt-4 text-break">
                              Карта успешно загружена: <a href={uploadUrl} target="_blank" rel="noopener noreferrer">{uploadUrl}</a>
                          </Alert>
                      )}
                      {error && (
                          <Alert variant="danger" className="mt-4">
                              {error}
                          </Alert>
                      )}
                      <Card className="mt-4">
                          <Card.Header>Сохраненные карты</Card.Header>
                          <ListGroup variant="flush">
                              {links.map((link, index) => (
                                  <ListGroup.Item key={index}>
                                      <strong>{link.name}</strong> - <em>{new Date(link.timestamp).toLocaleString()}</em><br/>
                                      <a href={link.url} target="_blank" rel="noopener noreferrer">{link.url}</a>
                                  </ListGroup.Item>
                              ))}
                          </ListGroup>
                      </Card>
                  </Card.Body>
              </Card>
          </div>
      </Container>
  );
};

export default App;