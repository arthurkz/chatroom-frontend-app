import React, { useEffect, useState } from "react"
import {over} from "stompjs"
import SockJs from "sockjs-client"

var stompClient = null

const ChatRoom = () => {
    const [publicChats, setPublicChats] = useState([])
    const [privateChats, setPrivateChats] = useState(new Map())
    const [tab, setTab] = useState("CHATROOM")

    const [userData, setUserData] = useState({
        username: "",
        receivername: "",
        connected: false,
        message: ""
    })
    useEffect(() => {
        console.log(userData)
    }, [userData])

    const handleUsername=(event)=>{
        const {value}=event.target;
        setUserData({...userData,"username": value});
    }

    const handleMessage =(event)=>{
        const {value}=event.target;
        setUserData({...userData,"message": value});
    }

    const registerUser = () => {
        let Sock = new SockJs("http://localhost:8080/ws")
        stompClient = over(Sock)
        stompClient.connect({}, onConnected, onError)
    }

    const onConnected = () => {
        setUserData({
            ...userData, 
            "connected": true
        })
        stompClient.subscribe("/chatroom/public", onPublicMessageReceived)
        stompClient.subscribe("/user/" + userData.username + "/private", onPrivateMessageReceived)
        userJoin()
    }
    
    const userJoin = () => {
        let chatMessage = {
            senderName: userData.username,
            status: "JOIN"
        }
        stompClient.send("/app/message", {}, JSON.stringify(chatMessage))
    }

    const onPublicMessageReceived = (payload) => {
        let payloadData = JSON.parse(payload.body)
        
        switch(payloadData.status){
            case "JOIN":
                
                if (!privateChats.get(payloadData.senderName)){
                    privateChats.set(payloadData.senderName, [])
                    setPrivateChats(new Map(privateChats))
                }
                break;

            case "MESSAGE":
                
                publicChats.push(payloadData)
                setPublicChats([...publicChats])
                break;

            default:
                break;
        }
    }

    const onPrivateMessageReceived = (payload) => {
        console.log(payload)
        let payloadData = JSON.parse(payload.body)

        if (privateChats.get(payloadData.senderName)) {
            privateChats.get(payloadData.senderName).push(payloadData)
            setPrivateChats(new Map(privateChats))
        } else {
            let list = []
            list.push(payloadData)
            privateChats.set(payloadData.senderName, list)
            setPrivateChats(new Map(privateChats))
        }
    }

    const sendPublicMessage = () => {
        if (stompClient){
            let chatMessage = {
                senderName: userData.username,
                message: userData.message,
                status: "MESSAGE"
            }
            stompClient.send("/app/message", {}, JSON.stringify(chatMessage))
            setUserData({
                ...userData,
                "message": ""
            })
        }
    }

    const sendPrivateMessage = () => {
        if (stompClient){
            let chatMessage = {
                senderName: userData.username,
                receiverName: tab,
                message: userData.message,
                status: "MESSAGE"
            }

            if (userData.username !== tab){
                privateChats.get(tab).push(chatMessage)
                setPrivateChats(new Map(privateChats))
            }

            stompClient.send("/app/private-message", {}, JSON.stringify(chatMessage))
            setUserData({
                ...userData,
                "message": ""
            })
        }
    }


    const onError = (err) => {
        console.log(err)
    }


    return (
        <div className="container">
            {
                userData.connected 
                    ? <div className="chat-box">

                        <div className="member-list">
                            <ul>
                                <li 
                                    onClick={ () => {setTab("CHATROOM")} }
                                    className={`member ${tab === "CHATROOM" && "active"}`}>
                                        Chatroom
                                </li>
                                {[...privateChats.keys()].map((name,index) => (
                                    <li 
                                        onClick={ () => {setTab(name)}} 
                                        className={`member ${tab === name && "active"}`} key={index}>
                                            {name}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {tab === "CHATROOM" && <div className="chat-content">
                            <ul className="chat-messages">
                            {publicChats.map((chat, index) => (
                                <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                                    {chat.senderName !== userData.username &&
                                        <div className="avatar">{chat.senderName}</div>
                                    }
                                    <div className="message-data">{chat.message}</div>
                                    {chat.senderName === userData.username &&
                                        <div className="avatar self">{chat.senderName}</div>
                                    }
                                </li>
                            ))}
                            </ul>

                            <div className="send-message">
                                <input 
                                    type="text" 
                                    className="input-message" 
                                    name="message" 
                                    placeholder="Digite uma mensagem pública" 
                                    value={userData.message} 
                                    onChange={handleMessage}/>
                                <button type="button" className="send-button" onClick={sendPublicMessage}>Enviar</button>
                            </div>

                        </div>}

                        {tab !== "CHATROOM" && <div className="chat-content">
                            <ul className="chat-messages">
                            {[...privateChats.get(tab)].map((chat, index) => (
                                <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                                    {chat.senderName !== userData.username &&
                                        <div className="avatar">{chat.senderName}</div>
                                    }
                                    <div className="message-data">{chat.message}</div>
                                    {chat.senderName === userData.username &&
                                        <div className="avatar self">{chat.senderName}</div>
                                    }
                                </li>
                            ))}
                            </ul>

                            <div className="send-message">
                                <input 
                                    type="text" 
                                    className="input-message"
                                    name="message"
                                    placeholder={`Digite uma mensagem privada para ${tab}`}
                                    value={userData.message} 
                                    onChange={handleMessage}/>
                                <button type="button" className="send-button" onClick={sendPrivateMessage}>Enviar</button>
                            </div>

                        </div>}

                      </div>
                    : <div className="register">

                        <input 
                            id="user-name"
                            name="username"
                            placeholder="Insira o nome do usuário"
                            value={userData.username}
                            onChange={handleUsername}
                        />
                        <button type="button" onClick={registerUser}>
                            conectar
                        </button>

                      </div>
            }

        </div>
    )
}

export default ChatRoom