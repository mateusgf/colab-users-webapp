import { Http, Response, Headers, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/toPromise';
import { Injectable } from '@angular/core'; 
import {Observable} from 'rxjs/Rx';

@Injectable()
export class UserService {

    constructor(private http: Http) {

    }

    private usersUrl = 'http://localhost:63145/api/users'; 

    getUsers() {
        return this.http.get(this.usersUrl).toPromise();
    }

    // getUsers() : Observable<Comment[]> {
    //              return this.http.get(this.usersUrl)
    //                              .map((res:Response) => res.json())
    //                              .catch((error:any) => Observable.throw(error.json().error || 'Server error'));
        
    // }
}