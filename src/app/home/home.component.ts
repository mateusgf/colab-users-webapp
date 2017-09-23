import {
  Component,
  OnInit,
  ElementRef,
  Renderer
} from '@angular/core';

import { AppState } from '../app.service';
import * as XLSX from 'xlsx';
import { UserService } from './user.service';
import { Socket } from 'ng2-socket-io';


@Component({
  selector: 'home',
  providers: [],
  styleUrls: [ './home.component.css' ],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  public usersCollection = [];
  public errors = [];
  public usersCollectionDatabase;
  public emailsOnDatabase = [];
  public cpfOnDatabase = [];
  public cnpjOnDatabase = [];

  constructor(
    public appState: AppState,
    public el: ElementRef,
    public renderer: Renderer,
    private userService: UserService,
    private socket: Socket
  ) {}

  public async ngOnInit() {

    // this.socket.on('connect', (data) => {
    //     this.socket.emit('join', 'Hello World from client');
    //  });

    this.socket.on('import_result', (userData) => {    
        //this.usersCollection.splice(userData.data.index, 1);
        this.usersCollectionDatabase.push(userData.data);
        this.refreshListOfEmails();
    });    

    var response = await this.userService.getUsers();
    this.usersCollectionDatabase = response.json().data;
    
    
    this.refreshListOfEmails();

    // Listen to file element
    let inputFileEl = this.el.nativeElement.querySelector('input');
    this.renderer.listen(inputFileEl, 'change', this.handleFileInput.bind(this));
  }

  public refreshListOfEmails() {
    this.usersCollectionDatabase.map((user) => {
        this.emailsOnDatabase.push(user.email);
        if (user.cpf) { this.cpfOnDatabase.push(user.cpf); }
        if (user.cnpj) { this.cnpjOnDatabase.push(user.cnpj); }
    });
  }

  public handleFileInput(evt) : void {
        this.errors = [];
        var self = this;
        var input = evt.target;

        var file:File = input.files[0]; 
        var myReader:FileReader = new FileReader();

        var parserType = 'csv';
        if (file.type != 'text/csv') {
            // Try with xls
            var parserType = 'xls';
        }
        myReader.onloadend = (e) => {
            var data = myReader.result;
            console.log('OUTPUT: ', data);

            if (parserType == 'csv') {
                var str = this.CSV2JSON(data);
            } else {
                var str = this.parseExcel(data);
                //@TODO: parse todas as colunas, checar sua existencia, se não existir criar com valor vazio.
            }

            var finalObj = JSON.parse(str);

            this.usersCollection = finalObj;

            this.usersCollection = this.validateUserData(this.usersCollection);
        }

        myReader.readAsBinaryString(file);
  }

  public validateUserInput(userData) {
    if (! ('name' in userData[0])) { this.pushError('Column "name" must be present'); }
    if (! ('email' in userData[0])) { this.pushError('Column "email" must be present'); }
    if (! ('cpf' in userData[0])) { this.pushError('Column "cpf" must be present'); }
    if (! ('cnpj' in userData[0])) { this.pushError('Column "cnpj" must be present'); }
    if (! ('phoneNumber' in userData[0])) { this.pushError('Column "phoneNumber" must be present'); }

    return this.errors.length > 0 ? false : true;
  }

  public pushError(errorString) {
    this.errors.push(errorString); 
    console.log(this.errors);
  }

  public validateUserData(userData) {

    if (! this.validateUserInput(userData)) return [];

    for (var i in userData) {

        userData[i].cpf = userData[i].cpf.trim();

        userData[i].validation = [];
        if (userData[i].name == '') {
            userData[i].validation.push('name_invalid');
        }

        if (userData[i].cpf && userData[i].cpf != '' && (!this.isValidCPF(userData[i].cpf))) {
            userData[i].validation.push('cpf_invalid');
        }

        if (this.emailsOnDatabase.indexOf(userData[i].email) > -1) {
            userData[i].validation.push('email_not_unique');
        }

        userData[i].index = i;

        if (userData[i].validation.length>0) {
            userData[i].import = false;
        } else {
            userData[i].import = true;
        }
    }    

    return userData;
  }

  public parseExcel(data) {
        var workbook = XLSX.read(data, {
            type: 'binary'
        });

        var str = '';
        workbook.SheetNames.forEach((sheetName) => {
            //var XL_row_object = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
            var XL_row_object = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            var json_object = JSON.stringify(XL_row_object);
            console.log(json_object);
            str = json_object;
        });

        return str;
  }

  public CSVToArray(strData, strDelimiter) {
    strDelimiter = (strDelimiter || ",");
    var objPattern = new RegExp((
    // Delimiters.
    "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
    // Quoted fields.
    "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
    // Standard fields.
    "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
    var arrData = [[]];
    var arrMatches = null;
    while (arrMatches = objPattern.exec(strData)) {
        var strMatchedDelimiter = arrMatches[1];
        if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
            arrData.push([]);
        }
        if (arrMatches[2]) {
            var strMatchedValue = arrMatches[2].replace(
            new RegExp("\"\"", "g"), "\"");
        } else {
            var strMatchedValue = arrMatches[3];
        }
        arrData[arrData.length - 1].push(strMatchedValue);
    }
    return (arrData);
  }

  public CSV2JSON(csv) {
    var array = this.CSVToArray(csv, ',');
    var objArray = [];
    for (var i = 1; i < array.length; i++) {
        objArray[i - 1] = {};
        for (var k = 0; k < array[0].length && k < array[i].length; k++) {
            var key = array[0][k];
            objArray[i - 1][key] = array[i][k]
        }
    }

    var json = JSON.stringify(objArray);
    var str = json.replace(/},/g, "},\r\n");

    return str;
  }

  public isValidCPF(strCPF) {

    strCPF = strCPF.split('.').join("");
    strCPF = strCPF.split('-').join("");
    strCPF = strCPF.trim();

    var soma;
    var resto;
    soma = 0;
    if (strCPF == "00000000000") return false;

    for (var i=1; i<=9; i++) soma = soma + parseInt(strCPF.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;

    if ((resto == 10) || (resto == 11))  resto = 0;
    if (resto != parseInt(strCPF.substring(9, 10)) ) return false;

    soma = 0;
    for (var i = 1; i <= 10; i++) soma = soma + parseInt(strCPF.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;

    if ((resto == 10) || (resto == 11))  resto = 0;
    if (resto != parseInt(strCPF.substring(10, 11) ) ) return false;
    return true;
  }

  public trackByFn(index,user){
    return user.index;
  }

  public trackByUserDatabaseFn(index,user){
    return user._id;
  }

  public toggleUserImport(index) {
    if (!this.usersCollection[index].import) {
        this.usersCollection[index].import = false;
    } else {
        this.usersCollection[index].import = true;
    }
  }

  public importSelected() {
    var users = this.usersCollection.filter( function( elem, i, array ) {
        return array[i].import ? elem : null;
    } );

    this.socket.emit('sendUsers', users);

    this.usersCollection = [];
    this.el.nativeElement.querySelector('input').value = "";
  }

}
