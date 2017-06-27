package com.company;

import java.io.*;
import java.net.Socket;
import java.util.Random;

/**
 * Created by Shakya on 6/27/2017.
 */
public class ClientHandlerThread extends Thread
{
    private final Socket socket;
    long clientId = -1;

    public ClientHandlerThread(Socket socket, long clientId)
    {
        this.socket = socket;
        this.clientId = clientId;
        System.out.println("Client " + clientId + " thread created ");
    }

    public void run()
    {
        System.out.println("Client " + clientId + " thread started ");

        InputStream inp = null;
        BufferedReader brinp = null;
        DataOutputStream out = null;
        try
        {
            inp = socket.getInputStream();
            brinp = new BufferedReader(new InputStreamReader(inp));
            out = new DataOutputStream(socket.getOutputStream());
        }
        catch (IOException e)
        {
            return;
        }
        String line;
        while (true)
        {
            Random rand = new Random();
            try
            {
                //                line = brinp.readLine();
                //                System.out.println("InputFromClient " + clientId + " : " + line);

                int intVal = rand.nextInt(1000);
                System.out.println("Client" + clientId + " " + intVal);
                out.writeBytes("Client" + clientId + " " + intVal + "\n");
                out.flush();

                Thread.sleep(1000);
            }
            catch (Exception e)
            {
                System.out.println("Exception " + clientId);
                e.printStackTrace();
                return;
            }
        }
    }
}
