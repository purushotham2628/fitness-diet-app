import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Community = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    content: '',
    workout_type: '',
    calories_burned: '',
    achievement: ''
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/api/community/posts', { withCredentials: true });
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/community/posts', formData, {
        withCredentials: true
      });
      setPosts([response.data, ...posts]);
      setFormData({
        content: '',
        workout_type: '',
        calories_burned: '',
        achievement: ''
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    }
  };

  const deletePost = async (id) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await axios.delete(`/api/community/posts/${id}`, { withCredentials: true });
        setPosts(posts.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post');
      }
    }
  };

  const likePost = async (id) => {
    try {
      const response = await axios.post(`/api/community/posts/${id}/like`, {}, {
        withCredentials: true
      });
      setPosts(posts.map(post => 
        post.id === id 
          ? { ...post, likes: response.data.likes, user_liked: response.data.user_liked }
          : post
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="loading">Loading community posts...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>👥 Community</h1>
          <button 
            className="btn" 
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Share Progress'}
          </button>
        </div>
        <p>Share your fitness journey and get inspired by others!</p>
      </div>

      {showForm && (
        <div className="card">
          <h2>Share Your Progress</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="content">What's your fitness story today?</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows="4"
                placeholder="Share your workout experience, motivation, or achievement..."
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="workout_type">Workout Type (Optional)</label>
                <input
                  type="text"
                  id="workout_type"
                  name="workout_type"
                  value={formData.workout_type}
                  onChange={handleInputChange}
                  placeholder="e.g., Cardio, Strength Training, Yoga"
                />
              </div>
              <div className="form-group">
                <label htmlFor="calories_burned">Calories Burned (Optional)</label>
                <input
                  type="number"
                  id="calories_burned"
                  name="calories_burned"
                  value={formData.calories_burned}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="300"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="achievement">Achievement (Optional)</label>
              <input
                type="text"
                id="achievement"
                name="achievement"
                value={formData.achievement}
                onChange={handleInputChange}
                placeholder="e.g., First 5K run, Lost 5 pounds, New personal record"
              />
            </div>
            
            <button type="submit" className="btn">
              Share Post
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Community Feed</h2>
        {posts.length > 0 ? (
          <div>
            {posts.map((post) => (
              <div key={post.id} className="post-item">
                <div className="item-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {post.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="item-title">{post.username}</div>
                      <div className="item-date">{formatDate(post.created_at)}</div>
                    </div>
                  </div>
                  {post.user_id === user?.id && (
                    <button 
                      className="btn btn-danger"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => deletePost(post.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
                
                <div style={{ margin: '15px 0', fontSize: '16px', lineHeight: '1.5' }}>
                  {post.content}
                </div>
                
                {(post.workout_type || post.calories_burned || post.achievement) && (
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '8px', 
                    margin: '15px 0',
                    border: '1px solid #e9ecef'
                  }}>
                    {post.workout_type && (
                      <div style={{ marginBottom: '8px' }}>
                        <strong>🏋️‍♂️ Workout:</strong> {post.workout_type}
                      </div>
                    )}
                    {post.calories_burned && (
                      <div style={{ marginBottom: '8px' }}>
                        <strong>🔥 Calories Burned:</strong> {post.calories_burned}
                      </div>
                    )}
                    {post.achievement && (
                      <div>
                        <strong>🏆 Achievement:</strong> {post.achievement}
                      </div>
                    )}
                  </div>
                )}
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  paddingTop: '15px',
                  borderTop: '1px solid #e9ecef'
                }}>
                  <button 
                    className={`btn ${post.user_liked ? '' : 'btn-secondary'}`}
                    style={{ 
                      padding: '8px 16px', 
                      fontSize: '14px',
                      background: post.user_liked ? 'linear-gradient(45deg, #667eea, #764ba2)' : '#6c757d'
                    }}
                    onClick={() => likePost(post.id)}
                  >
                    {post.user_liked ? '❤️' : '🤍'} {post.likes || 0} Like{(post.likes || 0) !== 1 ? 's' : ''}
                  </button>
                  
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    Keep up the great work! 💪
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center" style={{ padding: '40px' }}>
            <h3>No posts yet!</h3>
            <p>Be the first to share your fitness journey with the community.</p>
            <button 
              className="btn" 
              onClick={() => setShowForm(true)}
            >
              Share Your Progress
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;